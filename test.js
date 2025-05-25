```javascript
function factorial(n) {
    if (n === 0 || n === 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

// Sample class for handling user data
class UserManager {
    constructor() {
        this.users = new Map();
    }

    addUser(id, name) {
        this.users.set(id, { name, createdAt: new Date() });
    }
```javascript
    getUser(id) {
        return this.users.get(id);
    }

    removeUser(id) {
        return this.users.delete(id);
    }
}

// Example usage
const manager = new UserManager();
manager.addUser(1, "John Doe");
console.log(manager.getUser(1));

// A function that could use some improvement
function calculateTotal(items) {
```javascript
    for(let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

// Another function with potential issues
function processUserData(user) {
    if(user.age > 18) {
        console.log("Adult user");
    } else {
        console.log("Minor user");
    }
}

// A class that could use better structure
class DataProcessor {
    constructor() {
        this.data = [];
    }
    
    addData(item) {
        this.data.push(item);
    }
    
    getData() {
        return this.data;
    }
} 