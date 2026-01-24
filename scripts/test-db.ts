import { connectToDatabase } from "../database/mongoose";

/**
 * Performs a database connectivity check and terminates the process with a success or failure exit code.
 *
 * On success, logs "OK: Database connection succeeded" and exits with code 0.
 * On failure, logs "ERROR: Database connection failed" and the thrown error, then exits with code 1.
 */
async function main() {
    try {
        await connectToDatabase();
        // If connectToDatabase resolves without throwing, connection is OK
        console.log("OK: Database connection succeeded");
        process.exit(0);
    } catch (err) {
        console.error("ERROR: Database connection failed");
        console.error(err);
        process.exit(1);
    }
}

main();