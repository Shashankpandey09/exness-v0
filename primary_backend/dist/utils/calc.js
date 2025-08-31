"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcQuantity = void 0;
const calcQuantity = (margin, leverage, Price) => {
    const notional = margin * leverage;
    //price depends on buy / sell
    const quantity = notional / Price;
    return quantity;
};
exports.calcQuantity = calcQuantity;
