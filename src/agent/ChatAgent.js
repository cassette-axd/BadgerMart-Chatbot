
const createChatAgent = () => {

    const CS571_WITAI_ACCESS_TOKEN = "TIPRKN5X7UH2ZJWLVOREQ5DPQA3CF65I"; // Put your CLIENT access token here.

    let availableItems = [];
    let cart = [];

    const handleInitialize = async () => {
        const resp = await fetch("https://cs571api.cs.wisc.edu/rest/f24/hw10/items", {
            method: 'GET',
            headers: {
                "Authorization": "Bearer " + CS571_WITAI_ACCESS_TOKEN,
                'X-CS571-ID': 'bid_e7ec26af4ef707a35f841cb5b94bb44e16be845865dce36f04c32078521eed33',
            }
        })
        if (!resp.ok) {
            throw new Error(`Failed to fetch items: ${resp.statusText}`);
        }
        const data = await resp.json();
        availableItems = data;
        console.log(availableItems)
        return "Welcome to BadgerMart Voice! :) Type your question, or ask if you're lost!"
    };

    const handleReceive = async (prompt) => {
        // TODO: Replace this with your code to handle a user's message!
        const resp = await fetch("https://api.wit.ai/message?q=" + encodeURIComponent(prompt), {
            headers: {
                "Authorization": "Bearer " + CS571_WITAI_ACCESS_TOKEN
            }
        })
        const data = await resp.json();
        console.log(data)

        if (data.intents.length > 0) {
            switch(data.intents[0].name) {
                case "get_help": return await getHelp();
                case "get_items": return await getItems(data);
                case "get_price": return await getPrice(data);
                case "add_item": return await add_item(data);
                case "remove_item": return await remove_item(data);
                case "view_cart": return await view_cart();
                case "checkout": return await checkout();
            }
        }

        return "Sorry, I didn't get that. Type 'help' to see what you can do!"
    };

    const getHelp = async() => {
        return "In BadgerMart, you can get the list of items, the price of an item, add or remove and item from your cart, and checkout!";
    };

    const getItems = async() => {
        const itemNames = availableItems.map(item => item.name).join(", ");
        return `We have ${itemNames} for sale!`;
    };

    const getPrice = async(promptData) => {
        const itemText = promptData.text.toLowerCase();
        const matchingItem = availableItems.find(item => itemText.includes(item.name.toLowerCase()));

        if (matchingItem) {
            return `${matchingItem.name}s cost $${matchingItem.price.toFixed(2)} each.`;
        } else {
            return `Sorry, we don't have that item in stock.`;
        }
    };

    const add_item = async(promptData) => {
        const itemText = promptData.text.toLowerCase();
        const matchingItem = availableItems.find(item => itemText.includes(item.name.toLowerCase()));

        if (matchingItem) {
            const quantityMatch = itemText.match(new RegExp(`-?\\d*\\.?\\d+\\s+${matchingItem.name.toLowerCase()}`));
            let quantity = 1

            if (quantityMatch) {
                const quantityStr = quantityMatch[0].split(' ')[0];
                quantity = parseFloat(quantityStr);
            }
            if (quantity <= 0) {
                return `Invalid quantity.`
            }
            const itemToAdd = `${quantity} ${matchingItem.name}`;
            cart.push(itemToAdd);
            console.log(cart);
            return `Sure, adding ${itemToAdd} to your cart`;
        } else {
            return `Sorry, we don't have that item in stock.`;
        }
    };

    const remove_item = async(promptData) => {
        const itemText = promptData.text.toLowerCase();
        const matchingItem = availableItems.find(item => itemText.includes(item.name.toLowerCase()));

        if (matchingItem) {
            const quantityMatch = itemText.match(new RegExp(`-?\\d*\\.?\\d+\\s+${matchingItem.name.toLowerCase()}`));
            let quantity = 1

            if (quantityMatch) {
                const quantityStr = quantityMatch[0].split(' ')[0];
                quantity = parseFloat(quantityStr);
                console.log(quantity);
            }
            if (quantity <= 0) {
                return `Invalid quantity.`
            }
            const cartItemIndex = cart.findIndex(cartItem => cartItem.toLowerCase().includes(matchingItem.name.toLowerCase()));

            if (cartItemIndex === -1) {
                return `You don't have any ${matchingItem.name}s in your cart to remove.`;
            }

            const cartItem = cart[cartItemIndex];
            const [currentQuantityStr, itemName] = cartItem.split(' ');
            const currentQuantity = parseFloat(currentQuantityStr);

            if (quantity >= currentQuantity) {
                cart.splice(cartItemIndex, 1);
                return `Sure, removing all ${matchingItem.name}s from your cart.`;
            } else {
                const remainingQuantity = currentQuantity - quantity;
                cart[cartItemIndex] = `${remainingQuantity} ${matchingItem.name}`;
                console.log(cart);
                return `Sure, removing ${quantity} ${matchingItem.name} from your cart.`;
             }
        } else {
            return `Sorry, we don't have that item in stock.`;
        }
    };

    const view_cart = async() => {
        if (cart.length === 0) {
            return "Your cart is empty.";
        }
    
        let totalPrice = 0;
        let cartDetails = cart.map(cartItem => {
            const [quantityStr, ...itemNameParts] = cartItem.split(' ');
            const itemName = itemNameParts.join(' ');
            const quantity = parseFloat(quantityStr);
    
            const matchingItem = availableItems.find(item => item.name.toLowerCase() === itemName.toLowerCase());
            if (matchingItem) {
                const itemTotalPrice = matchingItem.price * quantity;
                totalPrice += itemTotalPrice;
                return `${quantity} ${matchingItem.name}`;
            }
            return null;
        }).filter(Boolean);
    
        const cartSummary = cartDetails.join(" and ");
        return `You have ${cartSummary} in your cart, totaling $${totalPrice.toFixed(2)}.`;
    };

    const checkout = async() => {
        if (cart.length === 0) {
            return "Your cart is empty. Add some items before checking out!";
        }

        const checkoutPayload = {};
            availableItems.forEach(item => {
            checkoutPayload[item.name] = 0;
        });


        let totalQuantity = 0;
        cart.forEach(cartItem => {
            const [quantityStr, ...itemNameParts] = cartItem.split(' ');
            const itemName = itemNameParts.join(' ').trim();
            const quantity = parseInt(quantityStr, 10);

            if (!Number.isInteger(quantity) || quantity < 0) {
                throw new Error(`Invalid quantity detected for ${itemName}: ${quantity}.`);
            }

            if (checkoutPayload.hasOwnProperty(itemName)) {
                checkoutPayload[itemName] += quantity;
                totalQuantity += quantity;
            } else {
                throw new Error(`Unexpected item in cart: ${itemName}.`);
            }
        });

        if (totalQuantity === 0) {
            return "You must order at least one item to checkout.";
        }

        try {
            const resp = await fetch("https://cs571api.cs.wisc.edu/rest/f24/hw10/checkout", {
                method: 'POST',
                headers: {
                    "Authorization": "Bearer " + CS571_WITAI_ACCESS_TOKEN,
                    "Content-Type": "application/json",
                    "X-CS571-ID": "bid_e7ec26af4ef707a35f841cb5b94bb44e16be845865dce36f04c32078521eed33",
                },
                body: JSON.stringify(checkoutPayload)
            });
    
            if (!resp.ok) {
                const errorData = await resp.json();
                console.error("Checkout Error:", errorData);
                return `Checkout failed: ${errorData.msg}`;
            }
    
            const data = await resp.json();
            cart = []; // Clear the cart on successful checkout
            return `Checkout successful! Your confirmation ID is ${data.confirmationId}.`;
        } catch (error) {
            console.error("Checkout error:", error);
            return "An error occurred while checking out. Please try again.";
        }
    };

    return {
        handleInitialize,
        handleReceive
    }
}

export default createChatAgent;