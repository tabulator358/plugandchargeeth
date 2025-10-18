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

      const excessiveAmount = ethers.parseUnits("10001", 6); // Above 10000 USDC limit

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

    it("Should allow quick faucet to give 1000 USDC", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const expectedAmount = ethers.parseUnits("1000", 6);

      await expect(usdc.connect(user1).quickFaucet())
        .to.emit(usdc, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, expectedAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(expectedAmount);
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

  describe("Edge Cases and Boundary Values", function () {
    it("Should enforce faucet limit correctly", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const maxFaucetAmount = ethers.parseUnits("10000", 6); // 10,000 USDC limit
      const overLimitAmount = ethers.parseUnits("10001", 6); // 10,001 USDC (over limit)

      // Should be able to get max amount
      await expect(usdc.connect(user1).faucet(maxFaucetAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, maxFaucetAmount);

      // Should not be able to get any more
      await expect(usdc.connect(user1).faucet(ethers.parseUnits("1", 6)))
        .to.be.revertedWith("MockUSDC: faucet limit exceeded");

      // Should not be able to get over limit amount
      await expect(usdc.connect(user1).faucet(overLimitAmount))
        .to.be.revertedWith("MockUSDC: faucet limit exceeded");
    });

    it("Should handle concurrent faucet calls", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const faucetAmount = ethers.parseUnits("1000", 6);

      // Multiple faucet calls should work up to limit
      await usdc.connect(user1).faucet(faucetAmount);
      await usdc.connect(user1).faucet(faucetAmount);
      await usdc.connect(user1).faucet(faucetAmount);
      await usdc.connect(user1).faucet(faucetAmount);
      await usdc.connect(user1).faucet(faucetAmount);

      // Should have 5000 USDC total
      expect(await usdc.balanceOf(user1.address)).to.equal(faucetAmount * 5n);

      // Can still get more up to limit
      await usdc.connect(user1).faucet(faucetAmount);
      await usdc.connect(user1).faucet(faucetAmount);
      await usdc.connect(user1).faucet(faucetAmount);
      await usdc.connect(user1).faucet(faucetAmount);
      await usdc.connect(user1).faucet(faucetAmount);

      // Should have 10000 USDC total (at limit)
      expect(await usdc.balanceOf(user1.address)).to.equal(ethers.parseUnits("10000", 6));

      // Should not be able to get more
      await expect(usdc.connect(user1).faucet(ethers.parseUnits("1", 6)))
        .to.be.revertedWith("MockUSDC: faucet limit exceeded");
    });

    it("Should handle quick faucet multiple times", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const quickFaucetAmount = ethers.parseUnits("1000", 6);

      // Multiple quick faucet calls
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).quickFaucet();

      // Should have 5000 USDC total
      expect(await usdc.balanceOf(user1.address)).to.equal(quickFaucetAmount * 5n);

      // Can still use quick faucet up to limit
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).quickFaucet();

      // Should have 10000 USDC total (at limit)
      expect(await usdc.balanceOf(user1.address)).to.equal(ethers.parseUnits("10000", 6));

      // Should not be able to get more
      await expect(usdc.connect(user1).quickFaucet())
        .to.be.revertedWith("MockUSDC: faucet limit exceeded");
    });

    it("Should handle mixed faucet and quick faucet calls", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const customAmount = ethers.parseUnits("2000", 6);
      const quickAmount = ethers.parseUnits("1000", 6);

      // Mix of faucet types
      await usdc.connect(user1).faucet(customAmount);
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).faucet(customAmount);
      await usdc.connect(user1).quickFaucet();
      await usdc.connect(user1).faucet(customAmount);
      await usdc.connect(user1).quickFaucet();

      // Should have 9000 USDC total (3 * 2000 + 3 * 1000)
      expect(await usdc.balanceOf(user1.address)).to.equal(ethers.parseUnits("9000", 6));

      // Can still get more up to limit
      await usdc.connect(user1).faucet(customAmount);
      await usdc.connect(user1).quickFaucet();

      // Should have 10000 USDC total (at limit)
      expect(await usdc.balanceOf(user1.address)).to.equal(ethers.parseUnits("10000", 6));

      // Should not be able to get more
      await expect(usdc.connect(user1).faucet(ethers.parseUnits("1", 6)))
        .to.be.revertedWith("MockUSDC: faucet limit exceeded");
    });

    it("Should handle zero amount faucet", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const zeroAmount = 0;

      await expect(usdc.connect(user1).faucet(zeroAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, zeroAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(zeroAmount);
    });

    it("Should handle very small faucet amounts", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const smallAmount = 1; // 1 wei (smallest unit)

      await expect(usdc.connect(user1).faucet(smallAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, smallAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(smallAmount);
    });

    it("Should track faucet usage correctly", async function () {
      const { usdc, user1 } = await loadFixture(deployMockUSDCFixture);

      const faucetAmount1 = ethers.parseUnits("1000", 6);
      const faucetAmount2 = ethers.parseUnits("2000", 6);

      // First faucet call
      await usdc.connect(user1).faucet(faucetAmount1);
      expect(await usdc.getFaucetUsed(user1.address)).to.equal(faucetAmount1);

      // Second faucet call
      await usdc.connect(user1).faucet(faucetAmount2);
      expect(await usdc.getFaucetUsed(user1.address)).to.equal(faucetAmount1 + faucetAmount2);

      // Quick faucet call
      await usdc.connect(user1).quickFaucet();
      expect(await usdc.getFaucetUsed(user1.address)).to.equal(faucetAmount1 + faucetAmount2 + ethers.parseUnits("1000", 6));
    });

    it("Should handle allowance edge cases", async function () {
      const { usdc, owner, user1, user2 } = await loadFixture(deployMockUSDCFixture);

      const transferAmount = ethers.parseUnits("1000", 6);

      // Set allowance
      await usdc.connect(owner).approve(user1.address, transferAmount);
      expect(await usdc.allowance(owner.address, user1.address)).to.equal(transferAmount);

      // Transfer from with exact allowance
      await usdc.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
      expect(await usdc.allowance(owner.address, user1.address)).to.equal(0);

      // Should not be able to transfer more
      await expect(
        usdc.connect(user1).transferFrom(owner.address, user2.address, 1)
      ).to.be.revertedWithCustomError(usdc, "ERC20InsufficientAllowance");
    });

    it("Should handle maximum allowance", async function () {
      const { usdc, owner, user1 } = await loadFixture(deployMockUSDCFixture);

      const maxAllowance = ethers.MaxUint256;

      await usdc.connect(owner).approve(user1.address, maxAllowance);
      expect(await usdc.allowance(owner.address, user1.address)).to.equal(maxAllowance);
    });

    it("Should handle zero allowance", async function () {
      const { usdc, owner, user1 } = await loadFixture(deployMockUSDCFixture);

      await usdc.connect(owner).approve(user1.address, 0);
      expect(await usdc.allowance(owner.address, user1.address)).to.equal(0);
    });

    it("Should handle transfer during active sessions", async function () {
      const { usdc, owner, user1, user2 } = await loadFixture(deployMockUSDCFixture);

      const transferAmount = ethers.parseUnits("1000", 6);

      // Transfer tokens
      await usdc.connect(owner).transfer(user1.address, transferAmount);
      expect(await usdc.balanceOf(user1.address)).to.equal(transferAmount);

      // Transfer from user1 to user2
      await usdc.connect(user1).transfer(user2.address, transferAmount);
      expect(await usdc.balanceOf(user1.address)).to.equal(0);
      expect(await usdc.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("Should handle minting to zero address", async function () {
      const { usdc, owner } = await loadFixture(deployMockUSDCFixture);

      const mintAmount = ethers.parseUnits("1000", 6);

      // Should not be able to mint to zero address
      await expect(
        usdc.connect(owner).mint(ethers.ZeroAddress, mintAmount)
      ).to.be.revertedWithCustomError(usdc, "ERC20InvalidReceiver");
    });

    it("Should handle minting zero amount", async function () {
      const { usdc, owner, user1 } = await loadFixture(deployMockUSDCFixture);

      const zeroAmount = 0;

      await expect(usdc.connect(owner).mint(user1.address, zeroAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, zeroAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(zeroAmount);
    });

    it("Should handle very large mint amounts", async function () {
      const { usdc, owner, user1 } = await loadFixture(deployMockUSDCFixture);

      const largeAmount = ethers.parseUnits("1000000", 6); // 1M USDC

      await expect(usdc.connect(owner).mint(user1.address, largeAmount))
        .to.emit(usdc, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, largeAmount);

      expect(await usdc.balanceOf(user1.address)).to.equal(largeAmount);
    });
  });
});
