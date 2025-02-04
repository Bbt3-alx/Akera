# Akera 

## Description
In today's world of gold trading and currency exchange, managing transactions is time-consuming and error prone. Akera changes that.

Gold traders and currency exchange businesses deal with thousands of transactions every month. Manual processes lead to lost time, errors, and a lack of transparency in reporting.
Studies show that small businesses lose 30% of revenue due to inefficient financial management tools.
What if managing all your accounts and transactions could be as simple as a few clicks?

Akera is a specialized platform designed to automate and simplify the operations of businesses involved in purchasing physical gold and shipping it globally, particularly to hubs like Dubai. The project aims to improve transparency and speed of operations while allowing users to track their performance and make informed decisions through analyses based on accurate and real-time data. Using modern technologies such as Node.js, Express, and MongoDB, Akera is primarily targeted at gold sales managers, and developers.

## Features
1. User Management: With dedicated endpoints for user signup and authentication, businesses can easily manage user access and ensure secure interactions within the system.
2. Streamlined Operations: The API provides endpoints for managing daily operations, including buying, shipping and selling gold or even generating receipt, which helps businesses streamline their processes and improve efficiency.
3. Comprehensive Financial Management: The API includes features for managing payments and transactions, allowing businesses to keep track of their financial activities in one place.
4. Partner and Company Management: Businesses can manage their relationships with partners and companies through specific API endpoints, facilitating better collaboration.
5. Scalability: As a finance management system, Akera is designed to grow with the business, accommodating increasing transaction volumes and operational complexity.
6. Improved Decision-Making: By centralizing data related to operations, payments, and transactions, businesses can gain insights that support informed decision-making and strategic planning.
7. Integration Capabilities: The API can be integrated with other systems and services, enhancing overall functionality and allowing businesses to tailor the solution to their specific needs.

## Objectives
The goal of this project is to provide an effective solution for gold operations, allowing users to:
- Easily manage their daily operations.
- Analyze sales/buy trends.
- Make informed decisions based on real-time data.

## Target Users
This application is targeted at:
- Gold Sales Managers: Looking for a simple and efficient way to manage their transactions.
- Users interested in gold trading: Wanting detailed tracking and management of their sales.
- Aspiring Developers: Seeking inspiration from best practices in development through a real-world application.

## Technologies Used
- Frontend: [React](https://reactjs.org/) for a responsive user interface.
- Backend: [Node.js](https://expressjs.com/) to create a RESTfull API.
- Database: [MongoDB](https://www.mongodb.com/) for persistent data storage.
- Authentication: Using JWT to secure API endpoints.

## Installation
### Prerequisites
- Node.js
- MongoDB

### Installation steps
1. Clone the repository:
   ```bash
   git clone https://github.com/Bbt3-alx/Akera
   ```
2. Navigate to the project directory
   ```bash
   cd Akera
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Configure your MongoDB database and other environment variable in a `.env` file.
   ```bash
   DATABASE_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   VITE_NODE_ENV=your_current_environment. ex: development
   MAILTRAP_TOKEN=your_mail_trap_token. // You can get one mailtrap.io
   ```

6. Start the server
   ```bash
   npm start
   ```

## API Documentation
For complete API documentation, visit: [API Documentation.](https://akera.onrender.com/api-docs/)

## Usage
1. Sign up or log in to your user account.(When signing up special 'manager as roles' to get access of all the features.
2. Create new company.
3. Add partner to your company
4. Update or remove existing partner as needed 
5. Create a new operation (buy, sell, shipping, etc) by entering the required details.
6. Update or delete existing Operation as needed.
7. View your past transactions and analyze your performance.

## Contribution
Contributions are welcome! If you would like to contribute, please:

1. Fork the project.
2. Create a branch (`git checkout -b feature/YourFeatureName`).
3. Make your changes and commit (`git commit -m 'Add a new feature'`).
4. Push to the branch (`git push origin feature/YourFeatureName`).
5. Open a Pull Request

## License
This project is licensed under the MIT License

## Acknowledgments
I would like to extend my heartfelt thanks to ALX Africa for their invaluable support throughout this training program. Their commitment to fostering talent and providing resources has been instrumental in my development as a backend developer.

Mentorship: Special thanks to the mentors who guided me through the learning process, offering insights and feedback that helped shape my understanding of software development.
Community Support: I am grateful for the collaborative environment fostered by ALX Africa, which encouraged knowledge sharing and teamwork among peers.
Resources: The access to learning materials, workshops, and hands-on projects provided by ALX Africa has greatly enhanced my skills and confidence in building real-world applications.
This project, Akera, is a direct result of the skills and knowledge I gained during this program, and I look forward to applying what I’ve learned in future endeavors.

## Author
### Brehyma Traore – Software Engineer
- [GitHub](https://github.com/Bbt3-alx)
- [Linkedin](https://linkedin.com/behymatraore)
- [X](https://x.com/BrehymaTraore)
- [Email](brehymatraore50@gmail.com)
