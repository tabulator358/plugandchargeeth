import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MockUSDC", function () {
  async function deployMockUSDCFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy("Mock USDC", "USDC", 6, owner.address);

    return { usdc, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { usdc } = await loadFixture(deployMockUSDCFixture);

      expect(await usdc.name()).to.equal("Mock USDC");
      expect(await usdc.symbol()).to.equal("USDC");
      expect(await usdc.decimals()).to.equal(6);
    });

    it("Should mint initial supply to owner", async function () {
      const { usdc, owner } = await loadFixture(deployMockUSDCFixture);

      const expectedSupply = ethers.parseUnits("1000000", 6); // 1M tokens
      expect(await usdc.balanceOf(owner.address)).to.equal(expectedSupply);
      expect(await usdc.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const { usdc, owner, user1 } = await loadFixture(deployMockUSDCFixture);

      const mintAmount = ethers.parseUnits("1000", 6);

      await expect(usdc.connect(owner).mint(user1.address, mintAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, mintAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const { usdc, user1, user2 } = await loadFixture(deployMockUSDCFixture);

      const mintAmount = ethers.parseUnits("1000", 6);

      await expect(usdc.connect(user1).mint(user2.address, mintAmount)).to.be.revertedWithCustomError(
        usdc,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("Faucet", function () {
    it("Should allow anyone to use faucet within limit", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const faucetAmount = ethers.parseUnits("100", 6);

      await expect(usdc.connect(user1).faucet(faucetAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, faucetAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(faucetAmount);
    });

    it("Should not allow faucet above limit", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const excessiveAmount = ethers.parseUnits("1001", 6); // Above 1000 USDC limit

      await expect(usdc.connect(user1).faucet(excessiveAmount)).to.be.revertedWith("MockUSDC: faucet limit exceeded");
    });

    it("Should allow multiple faucet calls up to limit", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const faucetAmount = ethers.parseUnits("500", 6);

      // First faucet call
      await usdc.connect(user1).faucet(faucetAmount);
      expect(await usdc.balanceOf(user1.address)).to.equal(faucetAmount);

      // Second faucet call
      await usdc.connect(user1).faucet(faucetAmount);
      expect(await usdc.balanceOf(user1.address)).to.equal(faucetAmount * 2n);
    });
  });

  describe("ERC20 Functionality", function () {
    it("Should allow transfers", async function () {
      const { usdc, owner, user1 } = await loadFixture(deployMockUSDCFixture);

      const transferAmount = ethers.parseUnits("1000", 6);

      await expect(usdc.connect(owner).transfer(user1.address, transferAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(owner.address, user1.address, transferAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(transferAmount);
    });

    it("Should allow approvals and transfers from", async function () {
      const { usdc, owner, user1, user2 } = await loadFixture(deployMockUSDCFixture);

      const transferAmount = ethers.parseUnits("1000", 6);

      // Approve
      await usdc.connect(owner).approve(user1.address, transferAmount);
      expect(await usdc.allowance(owner.address, user1.address)).to.equal(transferAmount);

      // Transfer from
      await expect(usdc.connect(user1).transferFrom(owner.address, user2.address, transferAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(owner.address, user2.address, transferAmount);

      expect(await usdc.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await usdc.allowance(owner.address, user1.address)).to.equal(0);
    });
  });

  describe("ERC20Permit Functionality", function () {
    it("Should have permit functionality available", async function () {
      const { usdc, owner } = await loadFixture(deployMockUSDCFixture);

      // Get domain separator
      const domainSeparator = await usdc.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.not.equal(ethers.ZeroHash);

      // Check nonces
      const nonce = await usdc.nonces(owner.address);
      expect(nonce).to.equal(0);

      // Check that permit function exists (we'll test actual permit in integration tests)
      expect(usdc.permit).to.be.a("function");
    });
  });
});
