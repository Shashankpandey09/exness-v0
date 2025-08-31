export const calcQuantity=(margin:number,leverage:number,Price:number,)=>{
const notional=margin*leverage;
//price depends on buy / sell
const quantity=notional/Price
return quantity;
}