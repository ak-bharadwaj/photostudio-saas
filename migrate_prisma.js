const fs = require('fs');
const path = require('path');

const directory = 'apps/backend/src';

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.ts')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;

            // Standardize all Prisma-related imports to just '@prisma/client'
            // This is the most compatible way across different environments
            content = content.replace(/from\s+['"]@prisma\/client\/runtime\/library['"]/g, "from '@prisma/client'");
            content = content.replace(/from\s+['"]@prisma\/client\/runtime\/client['"]/g, "from '@prisma/client'");
            content = content.replace(/from\s+['"]@prismaclient['"]/g, "from '@prisma/client'");
            
            // If Decimal is imported separately, try to get it from @prisma/client
            // Most modern Prisma versions export Decimal from the main entry point
            
            if (content !== originalContent) {
                console.log(`Updated: ${filePath}`);
                fs.writeFileSync(filePath, content, 'utf8');
            }
        }
    });
}

walk(directory);
console.log('Done standardizing Prisma imports.');
