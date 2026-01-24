import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * Tests the MongoDB connection using the MONGODB_URI environment variable and exits with a status code.
 *
 * Reads MONGODB_URI from the environment, attempts to connect with mongoose, logs a success message
 * containing the database name, host, and connection time, closes the connection, and exits with code 0.
 * If MONGODB_URI is missing it logs an error and exits with code 1. On connection failure it logs the error,
 * attempts to close the connection, and exits with code 1.
 */
async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('ERROR: MONGODB_URI must be set in .env');
        process.exit(1);
    }

    try {
        const startedAt = Date.now();
        await mongoose.connect(uri, { bufferCommands: false });
        const elapsed = Date.now() - startedAt;

        const dbName = mongoose.connection?.name || '(unknown)';
        const host = mongoose.connection?.host || '(unknown)';

        console.log(`OK: Connected to MongoDB [db="${dbName}", host="${host}", time=${elapsed}ms]`);
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('ERROR: Database connection failed');
        console.error(err);
        try { await mongoose.connection.close(); } catch {}
        process.exit(1);
    }
}

main();