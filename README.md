# Car Auction Backend

A Node.js backend application designed to manage car auction processes, including user authentication, database interactions, and API routing.

## Features

- **User Authentication**: Secure login and registration system.
- **Database Integration**: Seamless connection with a database to store and retrieve auction data.
- **API Routing**: Organized routes for handling various endpoints related to car auctions.

## Project Structure

```
carAuction-Backend/
├── auth/                 # Authentication-related modules
├── db/                   # Database connection and models
├── routes/               # API route handlers
├── app.js                # Main application file
├── testConnection.js     # Script to test database connectivity
├── package.json          # Project metadata and dependencies
└── package-lock.json     # Exact versions of installed dependencies
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.
- A running instance of your preferred database (e.g., MongoDB, MySQL).

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Nixon-ArockiaDhas/carAuction-Backend.git
   cd carAuction-Backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory and add necessary environment variables:

   ```env
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=your_database_name
   JWT_SECRET=your_jwt_secret
   ```

4. **Start the server:**

   ```bash
   npm start
   ```

   The server should now be running on `http://localhost:3000`.

## API Endpoints

- `POST /auth/register` - Register a new user.
- `POST /auth/login` - Authenticate a user and return a token.
- `GET /auctions` - Retrieve a list of car auctions.
- `POST /auctions` - Create a new car auction.
- `GET /auctions/:id` - Retrieve details of a specific auction.
- `PUT /auctions/:id` - Update an existing auction.
- `DELETE /auctions/:id` - Delete an auction.

*Note: Replace `/auctions` with the actual route defined in your `routes/` directory.*

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.