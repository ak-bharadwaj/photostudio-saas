const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            replaceInDir(fullPath);
        } else if (file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('@prismaclient') || content.includes('@prisma/client')) {
                // Calculate relative path to src/generated/prisma-client
                const relativeDir = path.relative(path.dirname(fullPath), path.join(process.cwd(), 'apps', 'backend', 'src', 'generated', 'prisma-client'));
                let relativePath = relativeDir.replace(/\\/g, '/');
                if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
                
                console.log(`Updating ${fullPath} -> ${relativePath}`);
                content = content.replace(/['"]@prismaclient['"]/g, `'${relativePath}'`);
                content = content.replace(/['"]@prisma\/client['"]/g, `'${relativePath}'`);
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

const srcDir = path.join(process.cwd(), 'apps', 'backend', 'src');
replaceInDir(srcDir);
