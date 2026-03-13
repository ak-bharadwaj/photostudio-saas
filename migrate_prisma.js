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
        } else if (filePath.endsWith('.ts') && !filePath.includes('generated-client')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;

            // Replace '@prismaclient' with '@prisma/client'
            content = content.replace(/from\s+['"]@prismaclient['"]/g, "from '@prisma/client'");
            content = content.replace(/import\s+(['"]@prismaclient['"])/g, "import '@prisma/client'");
            
            // Replace relative paths to generated-client with '@prisma/client'
            content = content.replace(/from\s+['"]\.\.\/prisma\/generated-client['"]/g, "from '@prisma/client'");
            content = content.replace(/from\s+['"]\.\.\/\.\.\/prisma\/generated-client['"]/g, "from '@prisma/client'");
            content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/prisma\/generated-client['"]/g, "from '@prisma/client'");

            // Replace runtime/client or runtime/library imports
            content = content.replace(/from\s+['"].*\/prisma\/generated-client\/runtime\/client['"]/g, "from '@prisma/client/runtime/library'");
             content = content.replace(/from\s+['"]@prismaclient\/runtime\/client['"]/g, "from '@prisma/client/runtime/library'");

            if (content !== originalContent) {
                console.log(`Updated: ${filePath}`);
                fs.writeFileSync(filePath, content, 'utf8');
            }
        }
    });
}

walk(directory);
console.log('Done replacement.');
