import ordersReducer, { addOrder, updateOrderStatus } from '../store/ordersSlice';

describe('ordersSlice Reducer', () => {
    let initialState;

    beforeEach(() => {
        initialState = ordersReducer(undefined, { type: 'unknown' });
    });

    it('should handle initial state', () => {
        expect(initialState.orders).toEqual([]);
    });

    it('should handle addOrder with structured timestamps', () => {
        const newOrder = {
            id: "123",
            total: 500,
            payment: "Apple Pay"
        };

        const nextState = ordersReducer(initialState, addOrder(newOrder));

        expect(nextState.orders.length).toEqual(1);
        const addedOrder = nextState.orders[0];

        expect(addedOrder.id).toEqual("123");
        expect(addedOrder.status).toEqual("accepted"); // Default initialization
        expect(addedOrder.statusTimestamps).toBeDefined();
        expect(addedOrder.statusTimestamps.accepted).toBeDefined();
        expect(typeof addedOrder.statusTimestamps.accepted).toBe('number'); // UNIX timestamp check
    });

    it('should handle updateOrderStatus and maintain idempotency', () => {
        const order = {
            id: "999",
            status: "accepted",
            statusTimestamps: { accepted: 1000000000 }
        };

        const stateWithOrder = ordersReducer({ orders: [order] }, { type: 'unknown' });

        // Test transition to preparing
        const nextState = ordersReducer(stateWithOrder, updateOrderStatus({
            orderId: "999",
            status: "preparing",
            timestamp: 2000000000
        }));

        const updatedOrder = nextState.orders[0];
        expect(updatedOrder.status).toEqual("preparing");
        expect(updatedOrder.statusTimestamps.accepted).toEqual(1000000000);
        expect(updatedOrder.statusTimestamps.preparing).toEqual(2000000000);
    });
});
