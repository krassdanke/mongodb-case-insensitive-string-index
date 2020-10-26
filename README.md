# MongoDB Loadtest: Case-insensitive string index vs. exact match string index
This loadtest aims at comparing case-insensitive string index using MongoDB collations vs. exact matching strings (default).

## Configuration and execution
To get up and running, clone the repository and install modules using `npm i`. Then, execute `npm start` to fire up the test.
You can customize the test run by passing the following enviroment variables to the script (e.g. `TEST_SET_SIZE=1000 npm start`):
| Variable in `process.env`  | Description  |
|---|---|
| TEST_SET_SIZE  | Number of Records (default is 100). For valid results, this should aim for 100.000 or more records.  |
| MONGO_URL  | URL to a custom MongoDB server instance (default is `localhost`).  |
| MONGO_DBNAME  | Name of the database used for testing (default is `loadtest`). The test will create two collections in it which will not be deleted by default to check results by hand in the database (such as index hit numbers).  |

## Preparation stage
For the test scenario, the script will create two database collections and their respective schemas and models. Then, it will create an index on the email field of the model. It will then fill the collection with fake records using faker module.

## Execution stage
In the execution stage, all records created will be used in a find-single expression. As the index is sorted and data created is randomized, this will access random indices. Nevertheless, the script will shuffle the set before iterating over it and find one record at a time.

## Evaluation
The output result will be displayed in a table. All time measurements are taken using Node's high-resolution timer by calling `process.hrtime()`.
