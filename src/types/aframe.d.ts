declare global {
    namespace JSX {
        interface IntrinsicElements {
            'a-scene': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                embedded?: boolean | string;
                'vr-mode-ui'?: string;
                renderer?: string;
                arjs?: string;
            };
            'a-assets': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'a-nft': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                type?: string;
                url?: string;
                smooth?: string;
                smoothCount?: string;
                smoothTolerance?: string;
                smoothThreshold?: string;
            };
            'a-video': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                src?: string;
                position?: string;
                rotation?: string;
                width?: string;
                height?: string;
            };
            'a-entity': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                camera?: boolean | string;
                'look-controls-enabled'?: string;
            };
        }
    }
}

export { };
