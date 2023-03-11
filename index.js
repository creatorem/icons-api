const fs = require('fs');
const _ = require('lodash');
const { getVariants, findSnakeVariant } = require('./scripts/utils');

const app = require('express')();
const PORT = 8080;

const getDirectories = (source) => {
    return fs
        .readdirSync(source, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
};

const getFiles = (source) => {
    return fs.readdirSync(source);
};

const getFileContent = (source) => {
    return fs.readFileSync(source, { encoding: 'utf8', flag: 'r' });
};

const iconFolders = getDirectories('./icons');

const getIconData = (lib, name) => {
    const icon = { name, defaultVariant: undefined, svg: undefined, variants: false };
    const snakeVariants = getVariants(lib).map((variant) => _.snakeCase(variant));

    if (fs.existsSync(`./icons/${lib}/${name}`) && fs.statSync(`./icons/${lib}/${name}`).isDirectory()) {
        icon.variants = {};
        const childFiles = getFiles(`./icons/${lib}/${name}`);

        for (const file of childFiles) {
            const fileName = file.replace('.svg', '');
            const variantUrl = getFileContent(`./icons/${lib}/${name}/${file}`);
            const variant = _.camelCase(findSnakeVariant(fileName, snakeVariants));

            icon.variants[variant] = {
                name: fileName,
                variant,
                svg: variantUrl,
            };

            if (fileName === name) {
                icon.svg = variantUrl;
                icon.defaultVariant = variant;
            }
        }
    } else {
        const variantUrl = getFileContent(`./icons/${lib}/${name}.svg`);
        const variant = _.camelCase(findSnakeVariant(name, snakeVariants));

        icon.svg = variantUrl;
        icon.defaultVariant = variant;
    }

    return icon;
};

app.get('/api/v1/sorted/:lib/:name', (req, res) => {
    const { lib, name } = req.params;

    if (!iconFolders.includes(lib)) {
        res.status(404).send({
            error: 'Library not found.',
        });
        return;
    }

    if (!fs.existsSync(`./icons/${lib}/${name}.svg`) && !fs.existsSync(`./icons/${lib}/${name}`)) {
        res.status(404).send({
            error: 'Icon not found.',
        });
        return;
    }

    const icon = getIconData(lib, name);
    res.status(200).send(icon);
});

app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));
