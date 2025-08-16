const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios'); // You will need to install axios: npm install axios

const endpoint = 'https://iccd-global-ebheacg6d3czfhdd.southafricanorth-01.azurewebsites.net/api/institutes';
const filePath = '../institutesDB/ICCD event DB - Org.csv'; // Make sure this path is correct

const results = [];

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`Found ${results.length} records in the CSV file.`);
    
    results.forEach(async (row) => {
        try {
            // Correct mapping of CSV data to the payload
            const payload = {
                instituteName: row['Institute_Name'], // Assuming first column is Institute_Name
                instituteType: row['Institute_Type'],
                institutePriority: row['Priority'],
                isVip: row['Is_VIP'] === 'TRUE'
            };

            // Basic validation to prevent sending empty data
            if (!payload.instituteName) {
                console.warn(`Skipping row with missing institute name.`);
                return;
            }

            const response = await axios.post(endpoint, payload);
            console.log(`Successfully added: ${payload.instituteName}`);
            
        } catch (error) {
            console.error(`Failed to add: ${row['Institute_Name']}. Error: ${error.message}`);
        }
    });
  });
