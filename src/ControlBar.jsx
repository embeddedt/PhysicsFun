import classnames from 'classnames';
export class ControlBar extends React.PureComponent {
    render() { return <div className={classnames("top-controls", this.props.translucent && "control-bar-translucent", this.props.noShadow && "control-bar-no-shadow")}>{this.props.children}</div>; }
}
const ControlSeparator = () => {
    return <span className="controls-separator"></span>;
}


export class ControlButton extends React.PureComponent {
    render() {
        let { icon, active, playHoverSound, title, ...rest } = this.props;
        const buttonClass = `hoverable-button control-button${(active && !rest.disabled) ? " hoverable-button-active" : ""}`;
        
        const buttonElement = <button className={buttonClass} {...rest}>
           {this.props.children}
        </button>;
        
        return buttonElement;
    }
    
}

const ControlArrow = props => {
    return <i className={`fas fa-caret-${props.direction}`}></i>;
};
const ControlMenu = props => {
    const [ menuOpen, setMenuOpen ] = React.useState(false);
    const onClick = React.useCallback(() => {
        setMenuOpen(!menuOpen);
    }, [ menuOpen ]);
    const childCount = menuOpen ? (React.Children.count(props.children) + 1.5) : 1;
    return <span className="control-menu" style={{
        maxWidth: `${(childCount * 2)}em`
    }}>
        <ControlButton icon={props.menuIcon} active={menuOpen} onClick={onClick}/>
        <span className="control-menu"><ControlArrow direction="right"/>{props.children}</span>
    </span>;
};

const ControlGroup = props => <span className="control-group">{props.children}</span>;

export { ControlSeparator, ControlMenu, ControlGroup };