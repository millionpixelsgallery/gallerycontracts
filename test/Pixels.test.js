const { expect } = require('chai')

describe('Pixels', function () {
  let p, buyer, buyer1, seller, fraud, signers, vault
  before(async () => {
    ;[buyer, buyer1, seller, fraud, creator, ...signers] = await ethers.getSigners()
    vault = creator
    const P = await ethers.getContractFactory('Pixels')
    p = await P.connect(creator).deploy('https://test.eth.link/areas/area-', creator.address, 50, 10)
    p = p.connect(buyer)
  })

  it('Should have correct top,medium area sizes', async function () {
    expect(await p.MEDIUM(0)).to.equal(475)
    expect(await p.MEDIUM(1)).to.equal(475)
    expect(await p.MEDIUM(2)).to.equal(50)
    expect(await p.MEDIUM(3)).to.equal(50)
    expect(await p.TOP(0)).to.equal(495)
    expect(await p.TOP(1)).to.equal(495)
    expect(await p.TOP(2)).to.equal(10)
    expect(await p.TOP(3)).to.equal(10)
  })

  it('Should be able to commit to pixels', async function () {
    const hash = ethers.utils.solidityKeccak256(['uint32[4]', 'uint256', 'address'], [[10, 10, 10, 10], 123, buyer.address])
    await p.commitToPixels(hash)
    const commit = await p.commits(hash)
    expect(commit).to.not.be.empty
    expect(commit).to.equal(2)
  })

  it('Should not be able to buy pixels without commit', async function () {
    await expect(p.connect(buyer1).buyPixels([10, 10, 10, 10], 123, 'world!')).to.revertedWith('commit not set')

    await expect(p.buyPixels([10, 10, 10, 10], 222, 'world')).to.revertedWith('commit not set')
    await expect(p.buyPixels([10, 10, 10, 10], 123, 'world!')).to.revertedWith('Pixels: invalid payment')
  })

  it('Should be able to buy pixels', async function () {
    const cost = await p.pixelsCost([10, 10, 10, 10])

    await expect(
      p.buyPixels([10, 10, 10, 10], 123, 'world!', {
        value: cost,
      })
    ).to.not.reverted
  })

  it('Should calcualte correct cost', async function () {
    //not intersection
    expect(await p.overlap([10, 10, 10, 10], [475, 475, 50, 50])).to.equal(0)
    expect(await p.overlap([10, 10, 10, 10], [495, 495, 10, 10])).to.equal(0)
    let cost = await p.pixelsCost([10, 10, 10, 10])

    expect(cost).to.equal(ethers.utils.parseEther((10 * 10 * 0.0005).toString()))

    //right bottom edge
    expect(await p.overlap([524, 524, 10, 10], [475, 475, 50, 50])).to.equal(1)
    expect(await p.overlap([524, 524, 10, 10], [495, 495, 10, 10])).to.equal(0)
    cost = await p.pixelsCost([524, 524, 10, 10])
    // console.log('2:', cost.toString(), ((0.01 + 99 * 0.005) / 100).toString())
    expect(cost).to.equal(ethers.utils.parseEther('0.050500000000000000'))

    //before top left edge
    expect(await p.overlap([465, 465, 10, 10], [475, 475, 50, 50])).to.equal(0)
    expect(await p.overlap([465, 465, 10, 10], [495, 495, 10, 10])).to.equal(0)
    cost = await p.pixelsCost([465, 465, 10, 10])
    console.log('3:', cost.toString())
    expect(cost).to.equal(ethers.utils.parseEther((100 * 0.0005).toString()))

    //top left edge
    expect(await p.overlap([466, 466, 10, 10], [475, 475, 50, 50])).to.equal(1)
    expect(await p.overlap([466, 466, 10, 10], [495, 495, 10, 10])).to.equal(0)
    cost = await p.pixelsCost([466, 466, 10, 10])
    console.log('4:', cost.toString())
    expect(cost).to.equal(ethers.utils.parseEther(/*(99 * 0.0005 + 0.01).toString()*/ '0.0505'))

    expect(await p.overlap([504, 504, 10, 10], [495, 495, 10, 10])).to.equal(1)
    expect(await p.overlap([504, 504, 10, 10], [475, 475, 50, 50])).to.equal(100)
    cost = await p.pixelsCost([504, 504, 10, 10])
    console.log('5:', cost.toString())
    expect(cost).to.equal(ethers.utils.parseEther((1 * 0.01 + (100 - 1) * 0.001).toString()))

    // 3 areas costs
    expect(await p.overlap([465, 485, 40, 20], [495, 495, 10, 10])).to.equal(100)
    expect(await p.overlap([465, 485, 40, 20], [475, 475, 50, 50])).to.equal(600)
    cost = await p.pixelsCost([465, 485, 40, 20])
    console.log('6:', cost.toString())
    expect(cost).to.equal(ethers.utils.parseEther(((40 * 20 - 600) * 0.0005 + (600 - 100) * 0.001 + 100 * 0.01).toString()))
  })

  it('Should not be able to buy pixels when intersecting pixels bought after commit', async function () {
    const hash = ethers.utils.solidityKeccak256(['uint32[4]', 'uint256', 'address'], [[20, 20, 10, 10], 123, buyer.address])
    await p.commitToPixels(hash)

    const hash2 = ethers.utils.solidityKeccak256(['uint32[4]', 'uint256', 'address'], [[20, 20, 5, 5], 123, buyer1.address])

    await p.connect(buyer1).commitToPixels(hash2)
    const cost = await p.pixelsCost([20, 20, 5, 5])

    await expect(
      p.connect(buyer1).buyPixels([20, 20, 5, 5], 123, 'world!', {
        value: cost,
      })
    ).to.not.reverted

    await expect(
      p.buyPixels([20, 20, 10, 10], 123, 'world!', {
        value: await p.pixelsCost([20, 20, 10, 10]),
      })
    ).to.revertedWith('revert buy failed. intersection found')
  })

  it('Should be able to buy intersecting pixels', async function () {
    const hash2 = ethers.utils.solidityKeccak256(['uint32[4]', 'uint256', 'address'], [[20, 20, 5, 5], 123, buyer.address])
    await p.connect(buyer).commitToPixels(hash2)
    const cost = await p.pixelsCost([20, 20, 5, 5])

    await expect(
      p.connect(buyer).buyPixels([20, 20, 5, 5], 123, 'world!', {
        value: cost,
      })
    ).to.not.reverted

    const orgArea = await p.getBounds(1)
    const secondArea = await p.getBounds(2)
    const overlap = await p.overlap(orgArea, secondArea)
    expect(overlap).to.be.gt(0)
  })

  it('Should remove intersecting pixels area fraud', async function () {
    await expect(p.removeFraud([1], [2])).to.revertedWith('not newer or not overlapping')
    await expect(p.removeFraud([2], [1])).to.not.revertedWith
    await expect(p.ownerOf(2)).to.revertedWith('ERC721: owner query for nonexistent token')
    const deleted = await p.areas(2)
    expect(deleted.ipfs).to.equal('')
    expect(deleted.mintedAtBlock).to.equal(0)
  })

  it('Should set tokenURI', async function () {
    expect(await p.tokenURI(0)).to.equal('https://test.eth.link/areas/area-0')
    expect(await p.baseURI()).to.equal('https://test.eth.link/areas/area-')
  })

  it('Should not be able to sell area if not owner', async function () {
    await expect(p.sell(1, ethers.utils.parseEther('1'), 7)).to.be.revertedWith('only owner can sell')
  })

  it('Should be able to sell area if owner', async function () {
    await expect(p.connect(buyer1).sell(1, ethers.utils.parseEther('1'), 7)).to.not.reverted
    const sale = await p.forSale(1)
    expect(sale.price).to.equal(ethers.utils.parseEther('1'))
    expect(await p.isForSale(1)).to.be.true
  })

  it('Should be able to unsell area if owner', async function () {
    await expect(p.connect(buyer1).sell(1, 0, 7)).to.not.reverted
    expect(await p.isForSale(1)).to.be.false
  })

  it('Should be able to buy area on sale', async function () {
    await expect(p.connect(buyer1).sell(1, ethers.utils.parseEther('1'), 7)).to.not.reverted
    const newHash = 'testipfshash1testipfshash1testipfshash1'
    await expect(p.buy(1, newHash)).to.revertedWith('payment too low')
    await expect(p.buy(1, newHash, { value: ethers.utils.parseEther('1') })).to.not.reverted
    const area = await p.areas(1)
    expect(area.ipfs).to.equal(newHash)
    expect(await p.ownerOf(1)).to.equal(buyer.address)
  })

  it('Should be able to change ipfs', async function () {
    const newHash = 'testipfshash1testipfshash1testipfshash2'
    await expect(p.connect(buyer1).setIPFSHash(1, newHash)).to.revertedWith('only owner')

    await p.connect(buyer).setIPFSHash(1, newHash)
    expect((await p.areas(1)).ipfs).to.equal(newHash)
  })

  it('Should transfer profits to vault', async function () {
    const cost = await p.pixelsCost([20, 20, 5, 5])
    const balance = await ethers.provider.getBalance(vault.address)

    await expect(
      p.connect(buyer).buyPixels([20, 20, 5, 5], 123, 'world!', {
        value: cost,
      })
    ).to.not.reverted
    const balanceAfter = await ethers.provider.getBalance(vault.address)
    expect(balanceAfter.sub(balance)).to.equal(cost)
  })

  it('Should collect fee and pay seller on resell', async function () {
    const balance = await ethers.provider.getBalance(vault.address)
    await expect(p.sell(1, ethers.utils.parseEther('1'), 7)).to.not.reverted
    await expect(p.buy(1, ethers.constants.HashZero, { value: ethers.utils.parseEther('1') })).to.not.reverted
    const balanceAfter = await ethers.provider.getBalance(vault.address)
    expect(balanceAfter.sub(balance)).to.equal(
      ethers.utils
        .parseEther('1')
        .mul(await p.fee())
        .div(ethers.BigNumber.from(10000))
    )
    expect(balanceAfter.sub(balance).toString()).to.equal((0.0375 * 1e18).toString()) //3.75% default fee
  })

  it('Should be able to set creator', async function () {
    await expect(p.connect(buyer1).setCreator(buyer1.address)).to.revertedWith('only creator')
    await expect(p.connect(creator).setCreator(buyer1.address)).to.not.reverted

    //resore creator
    await expect(p.connect(buyer1).setCreator(creator.address)).to.not.revertedWith
  })

  it('Should be able to set fee', async function () {
    await expect(p.connect(creator).setFee(400)).to.revertedWith('only lower fee')
    await expect(p.setFee(400)).to.revertedWith('only creator')

    await expect(p.connect(creator).setFee(300)).to.not.reverted

    await expect(await p.fee()).to.equal(300)
  })

  it('should buy for free if creator', async () => {
    const hash = ethers.utils.solidityKeccak256(['uint32[4]', 'uint256', 'address'], [[200, 200, 100, 100], 123, creator.address])
    await p.connect(creator).commitToPixels(hash)
    await expect(p.connect(creator).buyPixels([200, 200, 100, 100], 123, 'testcreator')).to.not.reverted
    const areasCount = await p.getAreasCount()
    expect(await p.ownerOf(areasCount - 1)).to.equal(creator.address)
    expect(await p.promotionalBought()).to.equal(10000)
  })

  it('should not be able to buy promotional areas more than limit', async () => {
    const hash = ethers.utils.solidityKeccak256(['uint32[4]', 'uint256', 'address'], [[300, 300, 450, 201], 123, creator.address])
    await p.connect(creator).commitToPixels(hash)
    await expect(p.connect(creator).buyPixels([300, 300, 450, 201], 123, 'testcreator')).to.revertedWith('promotional areas exceeds limit')
  })
})
