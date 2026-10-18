import './load-env';
import { connectToDatabase } from '../database/mongoose';
import { HistoricalBarModel } from '../database/models/historical_bar.model';

async function main() {
    console.log('Connecting to database...');
    try {
        await connectToDatabase();
        console.log('Connected successfully.');
        const count = await HistoricalBarModel.countDocuments();
        console.log(`Total historical bars in database: ${count}`);
        const symbols = await HistoricalBarModel.distinct('symbol');
        console.log(`Symbols found in database (${symbols.length}):`, symbols);
        for (const s of symbols) {
            const bars = await HistoricalBarModel.find({ symbol: s }).sort({ timestamp: 1 }).lean();
            console.log(`Symbol: ${s} | Count: ${bars.length} | Range: ${bars[0]?.timestamp} to ${bars[bars.length - 1]?.timestamp}`);
        }
    } catch (err: any) {
        console.error('Error checking database:', err.message);
    }
    process.exit(0);
}

main();
