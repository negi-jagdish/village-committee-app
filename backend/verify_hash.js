const bcrypt = require('bcryptjs');

const hash = '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G';
const password = '123456';

bcrypt.compare(password, hash).then(res => {
    console.log(`Does '${password}' match hash? ${res}`);
    if (!res) {
        bcrypt.hash(password, 10).then(newHash => {
            console.log(`Correct hash for '${password}': ${newHash}`);
        });
    }
});
