// @ts-ignore
const fs = require('fs');
// @ts-ignore
const _ = require('lodash');
// @ts-ignore
const { getVariants, findSnakeVariant } = require('./scripts/utils');

const app = require('express')();
const PORT = 8080;

const getDirectories = (source: string): void => {
    return fs
        .readdirSync(source, { withFileTypes: true })
        .filter((dirent: any) => dirent.isDirectory())
        .map((dirent: any) => dirent.name);
};

const getFiles = (source:string):void => {
    return fs
        .readdirSync(source, { withFileTypes: true })
        .filter((dirent:any) => dirent.isFile())
        .map((dirent:any) => dirent.name);
};

const getFileContent = (source) => {
    return fs.readFileSync(source, { encoding: 'utf8', flag: 'r' });
};

const iconFolders = getDirectories('./icons');

const limitLengthArray = (arr, start = undefined, end = undefined) => {
    if (end !== undefined) arr = arr.slice(0, end);
    if (start !== undefined) arr = arr.slice(start);
    return arr;
};

const searchIcons = (lib, search) => {
    const children = fs.readdirSync(`./icons/${lib}`);
    if (!search) return children;
    const searchValue = search.toLowerCase().replace(/\s+/g, '');
    return children.filter((child) => child.toLowerCase().includes(searchValue));
};

/**
 * Get name of icon without variant.
 *
 * @param string lib
 * @param string name
 * @returns
 */
const getRawName = (lib, name) => {
    const variants = getVariants(lib).map((variant) => _.snakeCase(variant));
    const rawName = _.upperFirst(
        _.camelCase(
            ('_' + _.snakeCase(name.replace('.svg', '')) + '_')
                .replace(new RegExp(`_(?:${variants.join('|')})_`, 'g'), '_')
                .replace(/^_+|_+$/g, '')
        )
    );
    return rawName;
};

const getVariantIconData = (lib, name) => {
    const icon = { name, defaultVariant: undefined, svg: undefined, variants: false };
    const snakeVariants = getVariants(lib).map((variant) => _.snakeCase(variant));

    if (fs.existsSync(`./icons/${lib}/${name}`) && fs.statSync(`./icons/${lib}/${name}`).isDirectory()) {
        icon.variants = {} as any;
        const childFiles = getFiles(`./icons/${lib}/${name}`);

        for (const file of childFiles) {
            const fileName = file.replace('.svg', '');
            const svg = getFileContent(`./icons/${lib}/${name}/${file}`);
            const variant = _.camelCase(findSnakeVariant(fileName, snakeVariants));

            icon.variants[variant] = {
                name: fileName,
                variant,
                svg: svg,
            };

            if (fileName === name) {
                icon.svg = svg;
                icon.defaultVariant = variant;
            }
        }
    } else {
        const svg = getFileContent(`./icons/${lib}/${name}.svg`);
        const variant = _.camelCase(findSnakeVariant(name, snakeVariants));

        icon.svg = svg;
        icon.defaultVariant = variant;
    }

    return icon;
};

/**
 *
 * @param string lib
 * @param string name
 * @param string|null rawName
 * @returns
 */
const getSingleIconData = (lib, name, rawName) => {
    const icon = { name, svg: undefined };

    if (
        rawName &&
        fs.existsSync(`./icons/${lib}/${rawName}`) &&
        fs.statSync(`./icons/${lib}/${rawName}`).isDirectory()
    ) {
        const svg = getFileContent(`./icons/${lib}/${rawName}/${name}.svg`);
        icon.svg = svg;
    } else {
        const svg = getFileContent(`./icons/${lib}/${name}.svg`);
        icon.svg = svg;
    }

    return icon;
};

app.get('/api/v1/sorted/:lib', (req, res) => {
    const { lib } = req.params;
    const { search, start, end } = req.query;

    if (!iconFolders.includes(lib)) {
        res.status(404).send({
            error: 'Library not found.',
        });
        return;
    }

    if (typeof search === 'string' && search.length < 3) {
        res.status(403).send({
            error: 'Enter at least 3 characters.',
        });
        return;
    }

    const matchedIcons = limitLengthArray(searchIcons(lib, search), undefined, end);
    const icons = matchedIcons.map((name) => getVariantIconData(lib, name.replace('.svg', '')));

    res.status(200).send(limitLengthArray(icons, start, end));
});

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

    const icon = getVariantIconData(lib, name);
    res.status(200).send(icon);
});

app.get('/api/v1/all/:lib', (req, res) => {
    const { lib } = req.params;
    const { search, start, end } = req.query;

    if (!iconFolders.includes(lib)) {
        res.status(404).send({
            error: 'Library not found.',
        });
        return;
    }

    let icons = [];

    if (search) {
        if (search.length < 3) {
            res.status(403).send({
                error: 'Enter at least 3 characters.',
            });
            return;
        }

        const matchedIcons = limitLengthArray(searchIcons(lib, search), undefined, end);
        icons = _.flatten(
            matchedIcons.map((child) => {
                if (
                    fs.existsSync(`./icons/${lib}/${child}`) &&
                    fs.statSync(`./icons/${lib}/${child}`).isDirectory()
                ) {
                    const files = getFiles(`./icons/${lib}/${child}`);
                    return files.map((file) => {
                        const name = file.replace('.svg', '');
                        return getSingleIconData(lib, name, child);
                    });
                }
                return getSingleIconData(lib, child.replace('.svg', ''), null);
            })
        );
    } else {
        const directories = limitLengthArray(getDirectories(`./icons/${lib}`), undefined, end);

        icons = _.flatten(
            directories.map((rawName) => {
                const files = getFiles(`./icons/${lib}/${rawName}`);
                return files.map((file) => {
                    const name = file.replace('.svg', '');
                    return getSingleIconData(lib, name, rawName);
                });
            })
        );

        const files = limitLengthArray(
            getFiles(`./icons/${lib}`),
            undefined,
            end ? end - icons.length : undefined
        );
        icons.push(...files.map((file) => getSingleIconData(lib, file.replace('.svg', ''), null)));
    }

    res.status(200).send(limitLengthArray(icons, start, end));
});

app.get('/api/v1/all/:lib/:name', (req, res) => {
    const { lib, name } = req.params;

    if (!iconFolders.includes(lib)) {
        res.status(404).send({
            error: 'Library not found.',
        });
        return;
    }

    const rawName = getRawName(lib, name);

    if (
        !fs.existsSync(`./icons/${lib}/${name}.svg`) &&
        (!fs.existsSync(`./icons/${lib}/${rawName}`) ||
            !fs.existsSync(`./icons/${lib}/${rawName}/${name}.svg`))
    ) {
        res.status(404).send({
            error: 'Icon not found.',
        });
        return;
    }

    const icon = getSingleIconData(lib, name, rawName);
    res.status(200).send(icon);
});

console.log(fs.readdirSync('./icons'));

app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));
