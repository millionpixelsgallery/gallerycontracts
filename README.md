# gallerycontracts

### Buy unclaimed area

In order to buy an unclaimed area, user first need to commit to the area, in order to prevent front-running or DDOS attack.

First check if area is available and doesnt intersect with existings areas by calling the view function
`isAreaAvailable(uint[4] area)`

Next call `commitToPixels(commitHash)` commitHash = keccack256(uint[4] area, byte32 ipfsHash, address user)

Finally call
`buyPixels(uint[4] area, byte32 ipfsHash) + value in ether`
  Value in ether can be calculated by calling the view function `pixelsCost(uint[4] area)`
  
### Iterate over areas
Area are numbered in sequential order.
calling `areas(uint256 index)` will return
```
struct Area {
        uint32[4] rect; //0 - X , 1- Y ,2 - width, 3 - height
        bytes32 ipfs;
        uint64 mintedAtBlock;
    }
```

If mintedAtBlock is 0, you have reached the end of the list.
rect might not be returned so call `getBounds(uint256 index)`

### Get area data
- check if area is on sale `forSale(uint256 index)` returns (price, timestamp end of sale)
- check if area is unclaimed `isAreaAvailable(uint[4] area)`
- owner of area `ownerOf(uint256 index)`

### Reselling areas
`sell(uint256 index, uint128 price, uint8 duration)` - price in Eth Wei, duration in days
`buy(uint256 index, bytes32 ipfsHash) + price in eth value` - ipfsHash the new data to attach to the area

