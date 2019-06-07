require('dotenv').config();
const app = require('./appAdmin');

const server = app.listen(3000, () => {
  console.log(`Main server is running on port ${server.address().port}`);
});
