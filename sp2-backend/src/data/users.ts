import { pool } from '../db.js';

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
  