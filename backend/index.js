require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const router = require('./routes');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the uploads folder statically so the frontend can view attachments
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});