import { SimpleIcon } from "simple-icons";

export const BrandIcon = ({ icon }: { icon: SimpleIcon }) => (
    <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d={icon.path} fill={`#${icon.hex}`} />
    </svg>
);
