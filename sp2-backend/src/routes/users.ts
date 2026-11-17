import { Router } from 'express';
import { createUser, findUserByUsername } from '../data/users.js';
import { hashPassword, verifyPassword } from '../auth/crypto.js';

export const users = Router();

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
