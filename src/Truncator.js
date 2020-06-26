'use strict';

export class Truncator {
    /**
     @class Truncator
     @summary Truncates content or marks it as paywall data
     @param {Object} options - Supplied configuration

     @param {String} options.selector - main content selector
     @param {String} options.threshold - number of words or percentage of content served for free
     @param {String} options.payWallClass - class to be added for paywall elements for googlebot
     */

    constructor(opts) {
        if (!opts) {
            opts = {};
        }

        this.payWallClass = opts.payWallClass || 'paywall';
        this.threshold = opts.threshold || '40%';
        this.selector = opts.selector || 'body';
    }

    /**
     * @method countWords
     * @memberOf Truncator
     * @instance
     * @summary Counts words
     * @private
     */
    countWords(children) {
        let count = 0;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.type === 'text') {
                const regex = /([^\s]+)/g;
                const parts = child.data.match(regex);
                if (parts) {
                    count += parts.length;
                }
            } else
            if (child.type === 'tag') {
                if (child.children) {
                    count += this.countWords(child.children);
                }
            }
        }

        return count;
    }

    /**
     * @method removeElement
     * @memberOf Truncator
     * @instance
     * @summary Removes non-free element
     * @private
     */
    removeElement($, child, mode) {
        switch (mode) {
            case 'human':
                child.type = 'text';
                child.data = '';
                break;
            case 'bot':
                switch (child.type) {
                    case 'tag':
                        let className = $(child).attr('class') || '';
                        if (className.split(/\s/g).indexOf(this.payWallClass) === -1) {
                            className += ' ' + this.payWallClass;
                        }
                        $(child).attr('class', className);
                        break;
                    case 'text':
                        const payData = $(child).text();
                        if (payData.trim()) {
                            const paySpan = $('<span></span>');
                            paySpan.attr('class', this.payWallClass);
                            paySpan.text(payData);
                            $(child).replaceWith(paySpan);
                        }
                        break;
                }
                break;
        }
    }

    /**
     * @method truncateWords
     * @memberOf Truncator
     * @instance
     * @summary Traverse DOM, counting words and removing after reaching the max
     * @private
     */
    truncateWords($, children, max, mode, context) {
        if (!context) {
            context = {
                level: 0,
                wordsCount: 0
            };
        }

        let count = 0;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];

            if (context.wordsCount + count > max) {
                this.removeElement($, child, mode);
                continue;
            }

            if (child.type === 'text') {
                const regex = /([^\s]+)/g;
                const parts = child.data.match(regex);

                let countWord = context.wordsCount + count;

                const freeData = child.data.replace(regex, (txt) => {
                    if (countWord > max) {
                        countWord++;
                        return '';
                    }
                    countWord++;
                    return txt;
                });

                const payData = child.data.substr(freeData.length);
                child.data = freeData;

                if (payData) {
                    const paySpan = $('<span></span>');
                    paySpan.attr('class', this.payWallClass);
                    paySpan.text(payData);
                    paySpan.insertAfter($(child));
                    i++;
                }

                if (parts) {
                    count += parts.length;
                }

            } else
            if (child.type === 'tag') {
                if (child.children) {
                    count += this.truncateWords($, child.children, max, mode, Object.assign({}, context, {
                        level: context.level + 1,
                        wordsCount: context.wordsCount + count
                    }));
                }
            }
        }

        return count;
    }

    /**
     * @method truncate
     * @memberOf Truncator
     * @instance
     * @summary Performs truncating over $ element
     * @public
     */
    truncate($, mode) {
        $('a[href^=#]', this.selector).remove();
        let max = 0;
        if (typeof this.threshold === 'string' && this.threshold.endsWith('%')) {
            const percent = parseInt(this.threshold.replace('%', ''));
            const words = this.countWords($(this.selector).contents());
            if (words > 0) {
                max = percent * words / 100;
            }
        } else {
            max = parseInt(this.threshold);
        }
        this.truncateWords($, $(this.selector).contents(), max, mode);
    }

}
