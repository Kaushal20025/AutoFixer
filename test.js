// Sample function to calculate factorial
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