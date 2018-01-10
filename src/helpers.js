import { Component } from 'react'
import h from 'react-hyperscript'
import PropTypes from 'prop-types'
import omit from 'lodash/omit'

export const List = ({ data, children, ...props }) =>
    h('ul', props, data.map((d) =>
        h('li', { key: d.id }, children(d))))

export class TextForm extends Component {
    static propTypes = {
        initialValue: PropTypes.string,
        onSubmit: PropTypes.func.isRequired,
        onBlur: PropTypes.func.isRequired,
    }
    state = {
        value: '',
    }
    componentDidMount () {
        this.setState({ value: this.props.initialValue })
        this.input.focus()
        setTimeout(() => this.input.select(), 1)
    }
    setRef = (el) => {
        this.input = el
    }
    onSubmit = (e) => {
        e.preventDefault()
        this.props.onSubmit(this.state.value)
    }
    onBlur = () => {
        this.props.onBlur(this.state.value)
    }
    onChange = (e) => {
        this.setState({ value: e.target.value })
    }
    render () {
        const { value = '' } = this.state
        const { onSubmit, onBlur, onChange } = this
        const containerProps = Object.assign(
            omit(this.props, ['onSubmit', 'onBlur', 'initialValue']),
            { ref: this.setRef, value, onChange, onBlur })

        return h('form', { onSubmit }, [
            h('input', containerProps),
        ])
    }
}
