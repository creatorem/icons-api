// @ts-ignore
const _ = require('lodash');

/**
 * Get the variants for a library.
 * First element is the default variant.
 *
 * @param string slug Library slug
 * @returns
 */
const getVariants = (slug: string): string[] => {
    if (slug === 'mui') {
        return ['Filled', 'Outlined', 'Rounded', 'Sharp', 'TwoTone'];
    } else if (slug === 'fa') {
        return ['Reg'];
    } else if (slug === 'tb') {
        return ['Filled'];
    } else if (slug === 'tfi') {
        return ['Alt'];
    }

    const defaultVariants = ['Fill', 'Outline'];

    if (slug === 'io5') {
        defaultVariants.push('Sharp');
    } else if (slug === 'ri') {
        defaultVariants.push('Line');
    } else if (slug === 'ai') {
        defaultVariants.push('Twotone');
    }

    return defaultVariants;
};

const findSnakeVariant = (str: string, snakeVariants: string[]): string => {
    const snakeStr = '_' + _.snakeCase(str) + '_';
    const variant = snakeVariants.find((variant) => snakeStr.includes('_' + variant.toLowerCase() + '_'));
    return variant || snakeVariants[0];
};

module.exports = {
    getVariants,
    findSnakeVariant,
};
