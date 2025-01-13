const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

// Configuration
const config = {
    content: {
        pages: path.join(__dirname, 'content', 'pages'),
        blog: path.join(__dirname, 'content', 'blog')
    },
    templates: path.join(__dirname, 'templates'),
    partials: path.join(__dirname, 'templates', 'partials'),
    public: path.join(__dirname, 'public'),
    output: path.join(__dirname, '..', 'dist')
};

// Ensure output directory exists
fs.ensureDirSync(config.output);

// Copy static assets
fs.copySync(config.public, config.output);

// Copy index.html directly
fs.copySync(
    path.join(config.templates, 'index.html'),
    path.join(config.output, 'index.html')
);

// Read templates
const baseTemplate = fs.readFileSync(
    path.join(config.templates, 'base.html'),
    'utf-8'
);
const blogTemplate = fs.readFileSync(
    path.join(config.templates, 'blog.html'),
    'utf-8'
);
const blogListTemplate = fs.readFileSync(
    path.join(config.templates, 'blog-list.html'),
    'utf-8'
);

// Read partials
const partials = {};
fs.readdirSync(config.partials).forEach(file => {
    if (path.extname(file) === '.html') {
        const partialName = path.basename(file, '.html');
        partials[partialName] = fs.readFileSync(
            path.join(config.partials, file),
            'utf-8'
        );
    }
});

// Replace partial placeholders in template
function applyPartials(template) {
    let result = template;
    Object.keys(partials).forEach(partialName => {
        const regex = new RegExp(`{{> ${partialName}}}`, 'g');
        result = result.replace(regex, partials[partialName]);
    });
    return result;
}

// Convert markdown to HTML and apply template
function processMarkdown(markdown, title, template = baseTemplate, metadata = {}) {
    // Replace both {{convertkit}} and {{ConvertKit}} with the proper partial syntax before markdown conversion
    markdown = markdown.replace(/{{[Cc]onvert[Kk]it}}/g, '{{> convertkit}}');
    
    const content = marked(markdown);
    let html = template;
    
    // Replace metadata placeholders
    const allMetadata = {
        ...metadata,
        title: title,
        content: content
    };
    
    Object.keys(allMetadata).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, allMetadata[key]);
    });

    // Apply partials after metadata
    html = applyPartials(html);
    
    return html;
}

// Process all markdown files in a directory
function processDirectory(sourceDir, outputDir, isBlogs = false) {
    fs.ensureDirSync(outputDir);
    
    const files = fs.readdirSync(sourceDir);
    const blogPosts = [];
    
    files.forEach(file => {
        // Skip index.md as we're using direct index.html
        if (file === 'index.md') return;
        
        if (path.extname(file) === '.md') {
            const sourcePath = path.join(sourceDir, file);
            const outputPath = path.join(
                outputDir,
                path.basename(file, '.md') + '.html'
            );
            
            const fileContent = fs.readFileSync(sourcePath, 'utf-8');
            const { data, content } = matter(fileContent);
            
            const title = data.title || path.basename(file, '.md')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            const metadata = {
                date: data.date ? new Date(data.date).toLocaleDateString() : '',
                title: isBlogs ? `${title} - Blog` : title
            };

            if (isBlogs) {
                // Store blog post info for the listing page
                blogPosts.push({
                    title,
                    date: metadata.date,
                    excerpt: content.split('\n')[0], // Use first paragraph as excerpt
                    url: `/blog/${path.basename(file, '.md')}.html`
                });
            }
            
            const template = isBlogs ? blogTemplate : baseTemplate;
            const html = processMarkdown(content, title, template, metadata);
            fs.writeFileSync(outputPath, html);
        }
    });

    // Generate blog listing page if we're processing blog posts
    if (isBlogs && blogPosts.length > 0) {
        // Sort blog posts by date (newest first)
        blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Generate HTML for blog listing
        const blogListHTML = blogPosts.map(post => `
            <article class="blog-list-item">
                <h2><a href="${post.url}">${post.title}</a></h2>
                <div class="blog-meta">
                    <time datetime="${post.date}">${post.date}</time>
                </div>
                <div class="blog-excerpt">
                    ${marked(post.excerpt)}
                </div>
                <a href="${post.url}" class="read-more">Read more →</a>
            </article>
        `).join('');

        let blogListPage = blogListTemplate.replace('{{blogPosts}}', blogListHTML);
        // Apply partials to blog list page
        blogListPage = applyPartials(blogListPage);
        fs.writeFileSync(path.join(outputDir, 'index.html'), blogListPage);
    }
}

// Process pages and blog posts
processDirectory(config.content.pages, config.output);
processDirectory(
    config.content.blog,
    path.join(config.output, 'blog'),
    true
); 