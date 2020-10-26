const mongoose = require('mongoose');
const faker = require('faker');

mongoose.connect(
    `mongodb://${process.env.MONGO_URL || 'localhost'}/${
        process.env.MONGO_DBNAME || 'loadtest'
    }`,
    { useNewUrlParser: true }
);

const numberOfRessources = process.env.TEST_SET_SIZE || 100;

const createItem = (modelBlueprint) => {
    return new modelBlueprint({
        name: faker.name.findName(),
        email: faker.internet.email(),
        age: faker.random.number(),
        street: faker.address.streetAddress(),
    });
};

const logTime = (time) => {
    console.log('Execution time (hr): %ds %dms', time[0], time[1] / 1000000);
};

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async function () {
    const durationA = await doNormalIndex();
    const durationB = await doCollationIndex();

    console.log('================================================');
    console.log('================== RESULTS =====================');
    console.log('================================================');

    console.table([
        {
            test: 'Normalization',
            stage: 'Insertion',
            duration: `${durationA.insert[0]}s ${
                durationA.insert[1] / 1000000
            }ms`,
        },
        {
            test: 'Normalization',
            stage: 'Index-Search',
            duration: `${durationA.index[0]}s ${
                durationA.index[1] / 1000000
            }ms`,
        },
        {
            test: 'Case-Insensitive Collation',
            stage: 'Insertion',
            duration: `${durationB.insert[0]}s ${
                durationB.insert[1] / 1000000
            }ms`,
        },
        {
            test: 'Case-Insensitive Collation',
            stage: 'Index-Search',
            duration: `${durationB.index[0]}s ${
                durationB.index[1] / 1000000
            }ms`,
        },
    ]);
});

const doNormalIndex = async () => {
    return new Promise(async (resolve, reject) => {
        const testSchemaA = new mongoose.Schema(
            {
                name: String,
                email: String,
                age: Number,
                street: String,
            },
            { autoIndex: true }
        );
        testSchemaA.index({ email: 1 });
        const TestModelA = mongoose.model('TestA', testSchemaA);

        // Create n records and store the key in a separate list
        const startTimeNormalInsert = process.hrtime();
        const findSet = [];
        for (let i = 0; i < numberOfRessources; i++) {
            const item = createItem();
            findSet.push(item.email);
            console.log(`item no. ${i}: ${JSON.stringify(item)}`);
            await item.save();
        }
        const endTimeNormalInsert = process.hrtime(startTimeNormalInsert);
        logTime(endTimeNormalInsert);

        // Find each of the records in our database
        const startTimeNormalIndex = process.hrtime();
        for (let email of findSet) {
            const res = await TestModelA.find({ email });
            console.log(`match: ${email} <> ${res[0].email}`);
        }

        const endTimeNormalIndex = process.hrtime(startTimeNormalIndex);
        logTime(endTimeNormalIndex);

        resolve({ index: endTimeNormalIndex, insert: endTimeNormalInsert });
    });
};

const doCollationIndex = async () => {
    return new Promise(async (resolve, reject) => {
        const testSchemaB = new mongoose.Schema(
            {
                name: String,
                email: String,
                age: Number,
                street: String,
            },
            { autoIndex: true }
        );
        testSchemaB.index(
            { email: 1 },
            { collation: { locale: 'en', strength: 2, caseLevel: false } }
        );
        const TestModelB = mongoose.model('TestB', testSchemaB);

        // Create n records and store the key in a separate list
        const startTimeCollationInsert = process.hrtime();
        let findSet = [];
        for (let i = 0; i < numberOfRessources; i++) {
            const item = createItem(TestModelB);
            findSet.push(item.email);
            console.log(`item no. ${i}: ${JSON.stringify(item)}`);
            await item.save();
        }
        const endTimeCollationInsert = process.hrtime(startTimeCollationInsert);
        logTime(endTimeCollationInsert);

        /*
            Since we want to try finding items using case-insensitive search,
            we map all emails in our set to their uppercase equivalent,
            as faker mostly tries avoiding emails formatted this way.
        */
        findSet = findSet.map((e) => e.toUpperCase());

        // Find each of the records in our database
        const startTimeCollationIndex = process.hrtime();
        for (let email of findSet) {
            const res = await TestModelB.find({ email }).collation({
                locale: 'en',
                strength: 2,
            });
            console.log(`match: ${email} <> ${res[0].email}`);
        }

        const endTimeCollationIndex = process.hrtime(startTimeCollationIndex);
        logTime(endTimeCollationIndex);

        resolve({
            index: endTimeCollationIndex,
            insert: endTimeCollationInsert,
        });
    });
};
