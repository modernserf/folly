import { Component } from 'react'
import h from 'react-hyperscript'
import PropTypes from 'prop-types'
import omit from 'lodash/omit'

export const any = (q) => !![...q].length

export const List = ({ data, children, ...props }) =>
    h('ul', props, data.map((d) =>
        h('li', { key: (d.id || d) }, children(d))))

export const Autocomplete = ({ value, options, onChange, ...props }) => {
    const re = new RegExp(value.split('').join('.*'), 'i')
    const filtered = options.filter(({ label }) => label && label.match(re))
    return h(List, { data: filtered, ...props }, ({ id, label }) =>
        h('button', { type: 'button', onClick: () => onChange(id) }, label))
}

export class TextForm extends Component {
    static propTypes = {
        initialValue: PropTypes.string,
        onSubmit: PropTypes.func.isRequired,
        onBlur: PropTypes.func.isRequired,
        children: PropTypes.func.isRequired,
    }
    static defaultProps = {
        onSubmit: () => {},
        onBlur: () => {},
        children: () => null,
    }
    state = {
        value: '',
    }
    componentDidMount () {
        this.setState({ value: this.props.initialValue })
        this.input.focus()
        setTimeout(() => this.input.select(), 1)
    }
    componentWillUnmount () {
        clearTimeout(this.blurTimeout)
    }
    setRef = (el) => {
        this.input = el
    }
    onSubmit = (e) => {
        e.preventDefault()
        this.props.onSubmit(this.state.value)
    }
    onBlur = () => {
        this.blurTimeout = setTimeout(() => {
            this.props.onBlur(this.state.value)
        }, 100)
    }
    onChange = (e) => {
        this.setState({ value: e.target.value })
    }
    render () {
        const { value = '' } = this.state
        const { children } = this.props
        const { onSubmit, onBlur, onChange } = this
        const containerProps = Object.assign(
            omit(this.props, ['onSubmit', 'onBlur', 'initialValue', 'children']),
            { ref: this.setRef, value, onChange })

        return h('form', { onSubmit, onBlur }, [
            h('input', containerProps),
            children({ value }),
        ])
    }
}

export class ContentEditable extends Component {
    static defaultProps = {
        onChange: () => {},
    }
    setNode = (node) => {
        this.node = node
    }
    onChange = (e) => {
        this.props.onChange(this.node.innerHTML, e)
    }
    render () {
        const { value, ...props } = this.props
        return h('div', {
            contentEditable: true,
            ref: this.setNode,
            onInput: this.onChange,
            onBlur: this.onChange,
            dangerouslySetInnerHTML: { __html: value },
            ...props,
        })
    }
}
