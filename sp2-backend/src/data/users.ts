// Data access for users: creating an account and looking one up for login.

import { pool } from '../db.js';

/**
 * Creates a user through the create_user database function and returns the new user_id.
 * A taken username fails with a unique violation (code 23505).
 */
export async function createUser
(
username: string,
passwordHash: string
):

Promise<number> 
{
const result = await pool.query<{ user_id: number }>

(
'SELECT create_user($1::varchar, $2::text) AS user_id',
[username, passwordHash]
);

return result.rows[0].user_id;
}


/** The user with the given username, including the password hash, or undefined if there is none. */
export async function findUserByUsername(username: string) 
{
const result = await pool.query<{
user_id: number;
username: string;
password: string;

}>(

`SELECT user_id, username, password
FROM app_user
WHERE username = $1`,
[username]
);
  
return result.rows[0];
}
  