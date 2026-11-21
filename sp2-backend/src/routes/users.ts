// /users: create an account and log in.

import { Router } from 'express';
import { createUser, findUserByUsername } from '../data/users.js';
import { hashPassword, verifyPassword } from '../auth/crypto.js';

export const users = Router();

// POST /users { username, password }: create a user. 201 with the new user, 409 if the username is taken.
// The username is 1-50 characters after trimming, and the password at least 8 characters.
users.post('/', async (req, res, next) => 
{
try 
{
const { username, password } = req.body ?? {};

if 
(
typeof 
username !== 'string' ||
username.trim().length === 0 ||
username.trim().length > 50 ||

typeof 
password !== 'string' ||
password.length < 8
) 
{
res.status(400).json
(
{
error: 'Invalid username or password'
});
      
return;
}

const passwordHash = await hashPassword(password);
const userId = await createUser(username.trim(), passwordHash);

res.status(201).json
(
{
userId,
username: username.trim()
}
);
} 

catch (error: any) 
{
// 23505 is PostgreSQL's unique violation: the username already exists.
if (error.code === '23505') 
{
res.status(409).json
(
{
error: 'Username already exists'
}
);
      
return;
}

next(error);
}
}
);


// POST /users/login { username, password }: check the credentials. 200 with the user, 401 if they are wrong.
// The same message for an unknown user and a wrong password, so it does not reveal which usernames exist.
users.post('/login', async (req, res, next) =>
{
try
{
const { username, password } = req.body ?? {};

if
(
typeof
username !== 'string' ||
username.trim().length === 0 ||

typeof
password !== 'string' ||
password.length === 0
)
{
res.status(400).json
(
{
error: 'Username and password are required'
}
);

return;
}

const user = await findUserByUsername(username.trim());

if
(
!user ||
!(await verifyPassword(password, user.password))
)
{
res.status(401).json
(
{
error: 'Invalid username or password'
}
);

return;
}

res.status(200).json
(
{
userId: user.user_id,
username: user.username
}
);
}

catch (error)
{
next(error);
}
}
);
