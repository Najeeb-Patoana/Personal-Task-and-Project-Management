require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const router = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(router);


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server:   http://localhost:${PORT}`);
});
