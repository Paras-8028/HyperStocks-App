import fs from 'fs';
import path from 'path';

/**
 * Loads environment variables from .env.local and .env for CLI scripts
 * without requiring additional third-party dependencies.
 */
export function loadEnvConfig(): void {
    const cwd = process.cwd();
    const envFiles = ['.env.local', '.env'];

    for (const file of envFiles) {
        const fullPath = path.resolve(cwd, file);
        if (fs.existsSync(fullPath)) {
            try {
                if (typeof (process as any).loadEnvFile === 'function') {
                    (process as any).loadEnvFile(fullPath);
                } else {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const lines = content.split(/\r?\n/);
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith('#')) continue;
                        const eqIndex = trimmed.indexOf('=');
                        if (eqIndex > 0) {
                            const key = trimmed.slice(0, eqIndex).trim();
                            let value = trimmed.slice(eqIndex + 1).trim();
                            if (
                                (value.startsWith('"') && value.endsWith('"')) ||
                                (value.startsWith("'") && value.endsWith("'"))
                            ) {
                                value = value.slice(1, -1);
                            }
                            if (process.env[key] === undefined) {
                                process.env[key] = value;
                            }
                        }
                    }
                }
            } catch (err) {
                // Ignore parsing errors for optional files
            }
        }
    }
}

// Auto-run when imported
loadEnvConfig();
