const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');

// Configuration
const config = {
    content: {
        pages: path.join(__dirname, 'content', 'pages'),
        blog: path.join(__dirname, 'content', 'blog')
    },
    templates: path.join(__dirname, 'templates'),
    public: path.join(__dirname, 'public'),
    output: path.join(__dirname, '..', 'dist')
};

// Ensure output directory exists
fs.ensureDirSync(config.output);

// Copy static assets
fs.copySync(config.public, config.output);

// Read base template
const baseTemplate = fs.readFileSync(
    path.join(config.templates, 'base.html'),
    'utf-8'
);

// Convert markdown to HTML and apply template
function processMarkdown(markdown, title) {
    const content = marked(markdown);
    return baseTemplate
        .replace('{{title}}', title)
        .replace('{{content}}', content);
}

// Process all markdown files in a directory
function processDirectory(sourceDir, outputDir) {
    fs.ensureDirSync(outputDir);
    
    const files = fs.readdirSync(sourceDir);
    
    files.forEach(file => {
        if (path.extname(file) === '.md') {
            const sourcePath = path.join(sourceDir, file);
            const outputPath = path.join(
                outputDir,
                path.basename(file, '.md') + '.html'
            );
            
            const markdown = fs.readFileSync(sourcePath, 'utf-8');
            const title = path.basename(file, '.md')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            const html = processMarkdown(markdown, title);
            fs.writeFileSync(outputPath, html);
        }
    });
}

// Process pages and blog posts
processDirectory(config.content.pages, config.output);
processDirectory(
    config.content.blog,
    path.join(config.output, 'blog')
); 