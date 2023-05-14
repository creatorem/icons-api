import fs from 'fs';
import _ from 'lodash';
import express from 'express';
import cors from 'cors';
import { getVariants, findSnakeVariant } from './utils.js';
import { CREDIT_URLS } from './constants.js';

const app: express.Express = express();
app.use(cors());

const getDirectories = (source: string): string[] => {
    return fs
        .readdirSync(source, { withFileTypes: true })
        .filter((dirent: fs.Dirent) => dirent.isDirectory())
        .map((dirent: fs.Dirent) => dirent.name);
};

const getFiles = (source: string): string[] => {
    return fs
        .readdirSync(source, { withFileTypes: true })
        .filter((dirent: fs.Dirent) => dirent.isFile())
        .map((dirent: fs.Dirent) => dirent.name);
};

const getFileContent = (source: string): string => {
    return fs.readFileSync(source, { encoding: 'utf8', flag: 'r' });
};

const iconFolders = getDirectories('./icons');

const limitLengthArray = <T>(
    arr: T[],
    start: number | undefined = undefined,
    end: number | undefined = undefined
): T[] => {
    if (end !== undefined) arr = arr.slice(0, end);
    if (start !== undefined) arr = arr.slice(start);
    return arr;
};

const searchIcons = (lib: string, search: string | undefined): string[] => {
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
const getRawName = (lib: string, name: string): string => {
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

interface Icon {
    name: string;
    svg: string | undefined;
    credit: string | undefined;
}

interface IconVariant {
    name: string;
    variant: string;
    svg: string;
}

interface SortedIcon extends Icon {
    name: string;
    defaultVariant: string | undefined;
    svg: string | undefined;
    variants: {
        [key in string]: IconVariant;
    };
}

const getVariantIconData = (lib: string, name: string): SortedIcon => {
    const icon: SortedIcon = {
        name,
        defaultVariant: undefined,
        svg: undefined,
        credit: CREDIT_URLS[lib],
        variants: {},
    };
    const snakeVariants = getVariants(lib).map((variant) => _.snakeCase(variant));

    if (fs.existsSync(`./icons/${lib}/${name}`) && fs.statSync(`./icons/${lib}/${name}`).isDirectory()) {
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
const getSingleIconData = (lib: string, name: string, rawName: string | null): Icon => {
    const icon: Icon = { name, svg: undefined, credit: CREDIT_URLS[lib] };

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

    if (
        (search !== undefined && typeof search !== 'string') ||
        (start !== undefined && typeof start !== 'string') ||
        (end !== undefined && typeof end !== 'string')
    ) {
        res.status(403).send({
            error: 'Search, start and end query must be a string.',
        });
        return;
    }

    if (typeof search === 'string' && search.length < 3) {
        res.status(403).send({
            error: 'Enter at least 3 characters.',
        });
        return;
    }

    const matchedIcons = limitLengthArray(
        searchIcons(lib, search),
        undefined,
        end ? parseInt(end, 10) : undefined
    );
    const icons = matchedIcons.map((name) => getVariantIconData(lib, name.replace('.svg', '')));

    res.status(200).send(
        limitLengthArray(icons, start ? parseInt(start, 10) : undefined, end ? parseInt(end, 10) : undefined)
    );
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

    if (
        (search !== undefined && typeof search !== 'string') ||
        (start !== undefined && typeof start !== 'string') ||
        (end !== undefined && typeof end !== 'string')
    ) {
        res.status(403).send({
            error: 'Search, start and end query must be a string.',
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

        const matchedIcons = limitLengthArray(
            searchIcons(lib, search),
            undefined,
            end ? parseInt(end, 10) : undefined
        );
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
        const directories = limitLengthArray(
            getDirectories(`./icons/${lib}`),
            undefined,
            end ? parseInt(end, 10) : undefined
        );

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
            end ? parseInt(end, 10) - icons.length : undefined
        );
        icons.push(...files.map((file) => getSingleIconData(lib, file.replace('.svg', ''), null)));
    }

    res.status(200).send(
        limitLengthArray(icons, start ? parseInt(start, 10) : undefined, end ? parseInt(end, 10) : undefined)
    );
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

app.get('/api/v1/variants/:lib', (req, res) => {
    const { lib } = req.params;

    if (!iconFolders.includes(lib)) {
        res.status(404).send({
            error: 'Library not found.',
        });
        return;
    }

    const variants = getVariants(lib).map((variant) => variant[0].toLowerCase() + variant.slice(1));
    res.status(200).send(variants);
});

app.listen(process.env.PORT || 3000);
