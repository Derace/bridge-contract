import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { DeRaceBridge, IERC20, IERC721Enumerable } from "../typechain";
import { ERC20PresetFixedSupply__factory } from "../typechain/factories/ERC20PresetFixedSupply__factory";
import { ERC721PresetMinterPauserAutoId__factory } from "../typechain/factories/ERC721PresetMinterPauserAutoId__factory";

const NAME = "DeRaceBridge";
const VERSION = "1";

const TRANSFER_TYPE = {
  Transfer: [
    { name: "sender", type: "address" },
    { name: "version", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "method", type: "bytes32" },
    { name: "token", type: "address" },
    { name: "data", type: "uint256" },
  ],
};

describe("DeRaceBridge", () => {
  let bridge: DeRaceBridge;
  let erc20: IERC20;
  let otherErc20: IERC20;
  let erc721: IERC721Enumerable;
  let otherErc721: IERC721Enumerable;
  let deployer: SignerWithAddress;
  let validator: SignerWithAddress;
  let superValidator: SignerWithAddress;
  let accounts: SignerWithAddress[];
  let domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    validator = signers[1];
    superValidator = signers[2];
    accounts = signers.slice(2);
    bridge = await (
      await ethers.getContractFactory("DeRaceBridge")
    ).deploy(NAME, VERSION);
    domain = {
      name: NAME,
      version: VERSION,
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: bridge.address,
    };
    await bridge.grantRole(await bridge.VALIDATOR_ROLE(), validator.address);
    await bridge.grantRole(
      await bridge.SUPER_VALIDATOR_ROLE(),
      superValidator.address
    );
    erc20 = await new ERC20PresetFixedSupply__factory(deployer).deploy(
      "ERC20",
      "ERC20",
      100,
      deployer.address
    );
    otherErc20 = await new ERC20PresetFixedSupply__factory(deployer).deploy(
      "Other ERC20",
      "OERC20",
      100,
      deployer.address
    );
    const _erc721 = await new ERC721PresetMinterPauserAutoId__factory(
      deployer
    ).deploy("ERC721", "ERC721", "");
    const _otherErc721 = await new ERC721PresetMinterPauserAutoId__factory(
      deployer
    ).deploy("Other ERC721", "OERC721", "");
    for (let index = 0; index < 10; index++) {
      await _erc721.mint(deployer.address);
      await _otherErc721.mint(deployer.address);
    }
    erc721 = _erc721 as unknown as IERC721Enumerable;
    otherErc721 = _otherErc721 as unknown as IERC721Enumerable;
  });

  describe("deposit", () => {
    describe("erc20", () => {
      it("should fail if insufficient balance", async () => {
        const [account] = accounts;
        await erc20.transfer(account.address, 2);
        await expect(bridge.connect(account).transferErc20(erc20.address, 3)).to
          .be.reverted;
      });

      it("should fail if amount not approved", async () => {
        const [account] = accounts;
        await erc20.transfer(account.address, 5);
        await expect(bridge.connect(account).transferErc20(erc20.address, 5)).to
          .be.reverted;
        await erc20.connect(account).approve(bridge.address, 4);
        await expect(bridge.connect(account).transferErc20(erc20.address, 5)).to
          .be.reverted;
      });

      it("should emit events for successful deposit and transfer amount to bridge", async () => {
        const [account, otherAccount] = accounts;
        await erc20.transfer(account.address, 5);
        await erc20.connect(account).approve(bridge.address, 5);
        const accountBalanceBefore = await erc20.balanceOf(account.address);
        const bridgeBalanceBefore = await erc20.balanceOf(bridge.address);
        await expect(bridge.connect(account).transferErc20(erc20.address, 5))
          .to.emit(bridge, "TransferErc20")
          .withArgs(account.address, erc20.address, 5);
        expect(await erc20.balanceOf(bridge.address)).to.equal(
          bridgeBalanceBefore.add(5)
        );
        expect(await erc20.balanceOf(account.address)).to.equal(
          accountBalanceBefore.sub(5)
        );

        await otherErc20.transfer(otherAccount.address, 1);
        await otherErc20.connect(otherAccount).approve(bridge.address, 1);
        const otherAccountBalanceBefore = await otherErc20.balanceOf(
          otherAccount.address
        );
        const bridgeOtherBalanceBefore = await otherErc20.balanceOf(
          bridge.address
        );
        await expect(
          bridge.connect(otherAccount).transferErc20(otherErc20.address, 1)
        )
          .to.emit(bridge, "TransferErc20")
          .withArgs(otherAccount.address, otherErc20.address, 1);
        expect(await otherErc20.balanceOf(bridge.address)).to.equal(
          bridgeOtherBalanceBefore.add(1)
        );
        expect(await otherErc20.balanceOf(otherAccount.address)).to.equal(
          otherAccountBalanceBefore.sub(1)
        );
      });
    });

    describe("erc721", () => {
      it("should fail if token not owned", async () => {
        const [account] = accounts;
        await expect(bridge.connect(account).transferErc721(erc721.address, 3))
          .to.be.reverted;
      });

      it("should fail if token not approved", async () => {
        const [account] = accounts;
        await erc721.transferFrom(deployer.address, account.address, 4);
        await erc721.transferFrom(deployer.address, account.address, 5);
        await expect(bridge.connect(account).transferErc721(erc721.address, 5))
          .to.be.reverted;
        await erc721.connect(account).approve(bridge.address, 4);
        await expect(bridge.connect(account).transferErc721(erc721.address, 5))
          .to.be.reverted;
      });

      it("should emit events for successful deposit and transfer token", async () => {
        const [account, otherAccount] = accounts;
        await erc721.transferFrom(deployer.address, account.address, 5);
        await erc721.connect(account).approve(bridge.address, 5);
        await expect(bridge.connect(account).transferErc721(erc721.address, 5))
          .to.emit(bridge, "TransferErc721")
          .withArgs(account.address, erc721.address, 5);
        expect(await erc721.ownerOf(5)).to.equal(bridge.address);

        await otherErc721.transferFrom(
          deployer.address,
          otherAccount.address,
          6
        );
        await otherErc721.connect(otherAccount).approve(bridge.address, 6);
        await expect(
          bridge.connect(otherAccount).transferErc721(otherErc721.address, 6)
        )
          .to.emit(bridge, "TransferErc721")
          .withArgs(otherAccount.address, otherErc721.address, 6);
        expect(await otherErc721.ownerOf(6)).to.equal(bridge.address);
      });
    });

    describe("multiple fungible erc721", () => {
      it("should fail if tokens not owned", async () => {
        const [account] = accounts;
        await erc721.transferFrom(deployer.address, account.address, 1);
        await erc721.transferFrom(deployer.address, account.address, 2);
        await expect(
          bridge.connect(account).transferErc721Any(erc721.address, 3)
        ).to.be.reverted;
      });

      it("should fail if token not approved", async () => {
        const [account] = accounts;
        await erc721.transferFrom(deployer.address, account.address, 1);
        await erc721.transferFrom(deployer.address, account.address, 2);
        await expect(
          bridge.connect(account).transferErc721Any(erc721.address, 3)
        ).to.be.reverted;
        await erc721.connect(account).approve(bridge.address, 1);
        await expect(
          bridge.connect(account).transferErc721Any(erc721.address, 3)
        ).to.be.reverted;
      });

      it("should emit events for successful deposit and transfer tokens to bridge", async () => {
        const [account, otherAccount] = accounts;
        await erc721.transferFrom(deployer.address, account.address, 1);
        await erc721.transferFrom(deployer.address, account.address, 2);
        await erc721.connect(account).setApprovalForAll(bridge.address, true);
        await expect(
          bridge.connect(account).transferErc721Any(erc721.address, 2)
        )
          .to.emit(bridge, "TransferErc721")
          .withArgs(account.address, erc721.address, 1)
          .and.to.emit(bridge, "TransferErc721")
          .withArgs(account.address, erc721.address, 2);
        expect(await erc721.ownerOf(1)).to.equal(bridge.address);
        expect(await erc721.ownerOf(2)).to.equal(bridge.address);

        await otherErc721.transferFrom(
          deployer.address,
          otherAccount.address,
          4
        );
        await otherErc721.transferFrom(
          deployer.address,
          otherAccount.address,
          5
        );
        await otherErc721.transferFrom(
          deployer.address,
          otherAccount.address,
          6
        );
        await otherErc721
          .connect(otherAccount)
          .setApprovalForAll(bridge.address, true);
        await expect(
          bridge.connect(otherAccount).transferErc721Any(otherErc721.address, 3)
        )
          .to.emit(bridge, "TransferErc721")
          .withArgs(otherAccount.address, otherErc721.address, 4)
          .and.to.emit(bridge, "TransferErc721")
          .withArgs(otherAccount.address, otherErc721.address, 5)
          .and.to.emit(bridge, "TransferErc721")
          .withArgs(otherAccount.address, otherErc721.address, 6);

        expect(await otherErc721.ownerOf(4)).to.equal(bridge.address);
        expect(await otherErc721.ownerOf(5)).to.equal(bridge.address);
        expect(await otherErc721.ownerOf(6)).to.equal(bridge.address);
      });
    });
  });

  describe("withdraw", () => {
    describe("erc20", () => {
      it("completes transfer, emits headers given a valid signature and increments nonce", async () => {
        const [account, otherAccount] = accounts;
        await erc20.transfer(bridge.address, 20);
        const version = await bridge.version();
        const nonce = await bridge.nonces(account.address);
        const balanceBefore = await erc20.balanceOf(account.address);
        const signature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce,
            method: await bridge.METHOD_ERC20(),
            token: erc20.address,
            data: 10,
          }
        );

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 10, signature)
        )
          .to.emit(bridge, "CompleteErc20Transfer")
          .withArgs(account.address, erc20.address, 10)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, version, nonce);
        expect(await erc20.balanceOf(account.address)).to.equal(
          balanceBefore.add(10)
        );
        expect(await bridge.nonces(account.address)).to.equal(nonce.add(1));

        const secondSignature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce: nonce.add(1),
            method: await bridge.METHOD_ERC20(),
            token: erc20.address,
            data: 5,
          }
        );

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 5, secondSignature)
        )
          .to.emit(bridge, "CompleteErc20Transfer")
          .withArgs(account.address, erc20.address, 5)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, version, nonce.add(1));
        expect(await erc20.balanceOf(account.address)).to.equal(
          balanceBefore.add(15)
        );
        expect(await bridge.nonces(account.address)).to.equal(nonce.add(2));

        await otherErc20.transfer(bridge.address, 25);
        const otherNonce = await bridge.nonces(otherAccount.address);
        const otherBalanceBefore = await otherErc20.balanceOf(
          otherAccount.address
        );
        const otherSignature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: otherAccount.address,
            version,
            nonce: otherNonce,
            method: await bridge.METHOD_ERC20(),
            token: otherErc20.address,
            data: 25,
          }
        );

        await expect(
          bridge
            .connect(otherAccount)
            .completeErc20Transfer(otherErc20.address, 25, otherSignature)
        )
          .to.emit(bridge, "CompleteErc20Transfer")
          .withArgs(otherAccount.address, otherErc20.address, 25)
          .and.to.emit(bridge, "Header")
          .withArgs(otherAccount.address, version, otherNonce);
        expect(await otherErc20.balanceOf(otherAccount.address)).to.equal(
          otherBalanceBefore.add(25)
        );
        expect(await bridge.nonces(otherAccount.address)).to.equal(
          otherNonce.add(1)
        );
      });

      it("does not allow double spend", async () => {
        const [account] = accounts;
        await erc20.transfer(bridge.address, 20);
        const version = await bridge.version();
        const nonce = await bridge.nonces(account.address);
        const balanceBefore = await erc20.balanceOf(account.address);
        const signature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce,
            method: await bridge.METHOD_ERC20(),
            token: erc20.address,
            data: 10,
          }
        );

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 10, signature)
        )
          .to.emit(bridge, "CompleteErc20Transfer")
          .withArgs(account.address, erc20.address, 10)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, version, nonce);
        expect(await erc20.balanceOf(account.address)).to.equal(
          balanceBefore.add(10)
        );

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 10, signature)
        ).to.be.revertedWith("NotValid");
        expect(await erc20.balanceOf(account.address)).to.equal(
          balanceBefore.add(10)
        );
      });

      it("works after updating version", async () => {
        const [account] = accounts;
        await erc20.transfer(bridge.address, 50);
        const version = await bridge.version();
        const nonce = await bridge.nonces(account.address);
        const balanceBefore = await erc20.balanceOf(account.address);
        const signature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce,
            method: await bridge.METHOD_ERC20(),
            token: erc20.address,
            data: 10,
          }
        );

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 10, signature)
        )
          .to.emit(bridge, "CompleteErc20Transfer")
          .withArgs(account.address, erc20.address, 10)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, version, nonce);
        expect(await erc20.balanceOf(account.address)).to.equal(
          balanceBefore.add(10)
        );
        expect(await bridge.nonces(account.address)).to.equal(nonce.add(1));

        await bridge.connect(superValidator).setVersion(5);
        expect(await bridge.version()).to.equal(5);

        const oldVersionSignature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce: nonce.add(1),
            method: await bridge.METHOD_ERC20(),
            token: erc20.address,
            data: 10,
          }
        );

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 10, oldVersionSignature)
        ).to.be.revertedWith("NotValid");

        const secondSignature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version: 5,
            nonce: nonce.add(1),
            method: await bridge.METHOD_ERC20(),
            token: erc20.address,
            data: 5,
          }
        );

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 5, secondSignature)
        )
          .to.emit(bridge, "CompleteErc20Transfer")
          .withArgs(account.address, erc20.address, 5)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, 5, nonce.add(1));
        expect(await erc20.balanceOf(account.address)).to.equal(
          balanceBefore.add(15)
        );
        expect(await bridge.nonces(account.address)).to.equal(nonce.add(2));
      });

      it("does not work when paused, works when unpaused", async () => {
        const [account] = accounts;
        await erc20.transfer(bridge.address, 20);
        const version = await bridge.version();
        const nonce = await bridge.nonces(account.address);
        const balanceBefore = await erc20.balanceOf(account.address);
        const signature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce,
            method: await bridge.METHOD_ERC20(),
            token: erc20.address,
            data: 10,
          }
        );

        await bridge.connect(superValidator).pause();

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 10, signature)
        ).to.be.reverted;

        await bridge.connect(superValidator).unpause();

        await expect(
          bridge
            .connect(account)
            .completeErc20Transfer(erc20.address, 10, signature)
        )
          .to.emit(bridge, "CompleteErc20Transfer")
          .withArgs(account.address, erc20.address, 10)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, version, nonce);
        expect(await erc20.balanceOf(account.address)).to.equal(
          balanceBefore.add(10)
        );
        expect(await bridge.nonces(account.address)).to.equal(nonce.add(1));
      });
    });

    describe("erc721", () => {
      it("transfers tokens", async () => {
        const [account, otherAccount] = accounts;
        await erc721.transferFrom(deployer.address, bridge.address, 5);
        await erc721.transferFrom(deployer.address, bridge.address, 6);
        const version = await bridge.version();
        const nonce = await bridge.nonces(account.address);
        const signature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce,
            method: await bridge.METHOD_ERC721(),
            token: erc721.address,
            data: 5,
          }
        );

        expect(await erc721.ownerOf(5)).to.equal(bridge.address);
        await expect(
          bridge
            .connect(account)
            .completeErc721Transfer(erc721.address, 5, signature)
        )
          .to.emit(bridge, "CompleteErc721Transfer")
          .withArgs(account.address, erc721.address, 5)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, version, nonce);
        expect(await erc721.ownerOf(5)).to.equal(account.address);
        expect(await bridge.nonces(account.address)).to.equal(nonce.add(1));

        const secondSignature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce: nonce.add(1),
            method: await bridge.METHOD_ERC721(),
            token: erc721.address,
            data: 6,
          }
        );

        expect(await erc721.ownerOf(6)).to.equal(bridge.address);
        await expect(
          bridge
            .connect(account)
            .completeErc721Transfer(erc721.address, 6, secondSignature)
        )
          .to.emit(bridge, "CompleteErc721Transfer")
          .withArgs(account.address, erc20.address, 6)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, version, nonce.add(1));
        expect(await erc721.ownerOf(6)).to.equal(account.address);
        expect(await bridge.nonces(account.address)).to.equal(nonce.add(2));

        await otherErc721.transferFrom(deployer.address, bridge.address, 1);
        const otherNonce = await bridge.nonces(otherAccount.address);
        const otherSignature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: otherAccount.address,
            version,
            nonce: otherNonce,
            method: await bridge.METHOD_ERC721(),
            token: otherErc721.address,
            data: 1,
          }
        );

        expect(await otherErc721.ownerOf(1)).to.equal(bridge.address);
        await expect(
          bridge
            .connect(otherAccount)
            .completeErc721Transfer(otherErc721.address, 1, otherSignature)
        )
          .to.emit(bridge, "CompleteErc721Transfer")
          .withArgs(otherAccount.address, otherErc721.address, 1)
          .and.to.emit(bridge, "Header")
          .withArgs(otherAccount.address, version, otherNonce);

        expect(await otherErc721.ownerOf(1)).to.equal(otherAccount.address);
        expect(await bridge.nonces(otherAccount.address)).to.equal(
          otherNonce.add(1)
        );
      });
    });

    describe("multiple fungible erc721", () => {
      it("transfers tokens", async () => {
        const [account] = accounts;
        await erc721.transferFrom(deployer.address, bridge.address, 5);
        await erc721.transferFrom(deployer.address, bridge.address, 6);
        const version = await bridge.version();
        const nonce = await bridge.nonces(account.address);
        const signature = await validator._signTypedData(
          domain,
          TRANSFER_TYPE,
          {
            sender: account.address,
            version,
            nonce,
            method: await bridge.METHOD_ERC721ANY(),
            token: erc721.address,
            data: 2,
          }
        );

        expect(await erc721.ownerOf(5)).to.equal(bridge.address);
        expect(await erc721.ownerOf(6)).to.equal(bridge.address);
        await expect(
          bridge
            .connect(account)
            .completeErc721AnyTransfer(erc721.address, 2, signature)
        )
          .to.emit(bridge, "CompleteErc721Transfer")
          .withArgs(account.address, erc721.address, 5)
          .to.emit(bridge, "CompleteErc721Transfer")
          .withArgs(account.address, erc721.address, 6)
          .and.to.emit(bridge, "Header")
          .withArgs(account.address, version, nonce);
        expect(await erc721.ownerOf(5)).to.equal(account.address);
        expect(await erc721.ownerOf(6)).to.equal(account.address);
        expect(await bridge.nonces(account.address)).to.equal(nonce.add(1));
      });
    });
  });
  describe("admin", () => {
    it("allows incrementing nonce", async () => {
      const [anyone] = accounts;
      const nonceBefore = await bridge.nonces(anyone.address);
      await expect(bridge.connect(superValidator).skipNonce(anyone.address))
        .to.emit(bridge, "Header")
        .withArgs(anyone.address, 0, nonceBefore);
      expect(await bridge.nonces(anyone.address)).to.equal(nonceBefore.add(1));
      await expect(bridge.connect(superValidator).skipNonce(anyone.address))
        .to.emit(bridge, "Header")
        .withArgs(anyone.address, 0, nonceBefore.add(1));
      expect(await bridge.nonces(anyone.address)).to.equal(nonceBefore.add(2));
    });
    describe("migration", () => {
      it("allows migrating erc20 out", async () => {
        const [anyone] = accounts;
        await erc20.transfer(bridge.address, 25);
        await bridge
          .connect(superValidator)
          .migrateErc20(erc20.address, anyone.address, 15);
        expect(await erc20.balanceOf(anyone.address)).to.equal(15);
        expect(await erc20.balanceOf(bridge.address)).to.equal(10);
      });
      it("erc721", async () => {
        const [anyone] = accounts;
        await erc721.transferFrom(deployer.address, bridge.address, 2);
        await bridge
          .connect(superValidator)
          .migrateErc721(erc721.address, anyone.address, 2);
        expect(await erc721.ownerOf(2)).to.equal(anyone.address);
      });
      it("multiple fungible erc721", async () => {
        const [anyone] = accounts;
        await erc721.transferFrom(deployer.address, bridge.address, 2);
        await erc721.transferFrom(deployer.address, bridge.address, 3);
        await bridge
          .connect(superValidator)
          .migrateErc721Any(erc721.address, anyone.address, 2);
        expect(await erc721.ownerOf(2)).to.equal(anyone.address);
        expect(await erc721.ownerOf(3)).to.equal(anyone.address);
      });
    });
  });
});
