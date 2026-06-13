-- Create the user and grant database permissions
CREATE USER "user" WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE minierp TO "user";
ALTER DATABASE minierp OWNER TO "user";
