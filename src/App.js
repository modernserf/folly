import React, { Component, Fragment } from 'react'
import { Provider, connect } from 'react-redux'
import styled from 'styled-components'
import { store } from './data'
import './App.css'

const where = (xs, query) =>
    xs.filter((x) => Object.entries(query).every(([k, v]) => x[k] === v))

const List = ({ data, children, ...props }) =>
    <ul {...props}>{data.map((d) => (
        <li key={d.id}>{children(d)}</li>
    ))}</ul>

const Container = styled.section`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    header {
        border-radius: 1em 1em 0 0;
        padding: 0.5em;
        color: white;
        background-color: black;
        display: inline-block;
    }
`

const FactList = styled(List)`
    min-width: 50vw;
    border: 1px solid black;
    padding: 0.5em;
    border-radius: 0 1em 1em 1em;
    &>li+li {
        margin-top: 0.5em;
    }
`

const FactRowContainer = styled.div`
    display: flex;
    button {
        appearance: none;
        border: none;
        text-decoration: underline;
    }
`

const FactRowLabel = styled.span`
    flex: 1 0 auto;
`

const FactActions = styled.span`
    flex: 0 0 auto;
`

const EditFactRow = connect(
    ({ data }, { id }) => ({ value: where(data, { id })[0].label }),
)(class EditFactRow extends Component {
    state = {
        value: '',
    }
    componentDidMount () {
        this.setState({ value: this.props.value })
        this.input.focus()
        setTimeout(() => this.input.select(), 1)
    }
    updateFact = () => {
        this.props.dispatch('updateFact', { value: this.state.value, id: this.props.id })
    }
    setBuffer = (e) => {
        this.setState({ value: e.target.value })
    }
    render () {
        return (
            <form onSubmit={(e) => { e.preventDefault(); this.updateFact() }}>
                <input ref={(el) => { this.input = el }}
                    value={this.state.value}
                    onChange={this.setBuffer}
                    onBlur={this.updateFact}
                />
            </form>
        )
    }
})

const FactRow = connect(
    ({ data }, { id }) => ({
        item: where(data, { id })[0],
    })
)(class FactRow extends Component {
    render () {
        const { id, item, dispatch } = this.props
        return (
            <FactRowContainer>
                {{
                    edit: () => <EditFactRow id={id} />,
                    view: () => <FactRowLabel>{item.label}</FactRowLabel>,
                }[item.viewState]()}
                <FactActions>
                    <button
                        onClick={() => dispatch('editItem', {id})}
                    >Edit</button>
                    <button
                        onClick={() => dispatch('disableItem', {id})}
                    >Disable</button>
                    <button
                        onClick={() => dispatch('deleteItem', {id})}
                    >Delete</button>
                </FactActions>
            </FactRowContainer>
        )
    }
})

const FactGroup = connect(
    ({ data }, { id }) => ({
        parent: where(data, { id })[0],
        items: where(data, { type: 'fact', parentID: id }),
    })
)(class FactGroup extends Component {
    render () {
        const { id, parent, items, dispatch } = this.props

        return (
            <Fragment>
                <Container>
                    <header>
                        <h1>{parent.label}</h1>
                    </header>
                    <FactList data={items}>{(x) => (
                        <FactRow id={x.id} />
                    )}</FactList>
                </Container>
                <button onClick={() => dispatch('createFact', { parentID: id })}>New Fact</button>
            </Fragment>
        )
    }
})

const AppBody = styled(List)`
    font-family: "Parc Place";
    -webkit-font-smoothing: none;
    button {
        -webkit-font-smoothing: subpixel-antialiased;
    }
    font-size: 12px;
    &>li {
        margin: 1em;
    }
`

const App = connect(
    ({ data }) => ({ groups: where(data, { type: 'fact-group' }) })
)(class App extends Component {
    render () {
        const { groups, dispatch } = this.props
        return (
            <Fragment>
                <AppBody data={groups}>{(f) => (
                    <FactGroup id={f.id} />
                )}</AppBody>
                <button
                    onClick={() => dispatch('createList')}
                >New List</button>
            </Fragment>
        )
    }
})

const Root = () => <Provider store={store}><App /></Provider>

export default Root
