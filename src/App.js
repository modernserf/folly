import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'
import './App.css'

const stations = {
    label: 'Stations',
    items: [
        'Alewife',
        'Davis',
        'Porter',
        'Harvard',
        'Central',
        'Kendall',
        'Charles/MGH',
        'Park St',
        'Downtown Crossing',
        'South Station',
        'Broadway',
        'Andrew',
        'JFK/UMass'
    ]
}

const lines = {
    label: 'Lines',
    items: [
        'Red',
        'Blue',
        'Orange',
        'Green'
    ]
}

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
    ul {
        min-width: 50vw;
        border: 1px solid black;
        padding: 0.5em;
        border-radius: 0 0 1em 1em;
    }
    li+li {
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

class FactRow extends Component {
    static propTypes = {
        data: PropTypes.string.isRequired
    }
    render () {
        const { data } = this.props
        return (
            <FactRowContainer>
                <FactRowLabel>{data}</FactRowLabel>
                <FactActions>
                    <button>Edit</button>
                    <button>Disable</button>
                    <button>Delete</button>
                </FactActions>
            </FactRowContainer>
        )
    }
}

class FactList extends Component {
    static propTypes = {
        data: PropTypes.object.isRequired
    }
    render () {
        const { label, items } = this.props.data
        return (
            <Container>
                <header>
                    <h1>{label}</h1>
                </header>
                <ul>{items.map((x) => (
                    <li key={x}>
                        <FactRow data={x} />
                    </li>
                ))}</ul>
            </Container>
        )
    }
}

const AppBody = styled.ul`
    font-family: "Parc Place";
    font-size: 12px;
`

const FactListWrap = styled.li`
    margin: 1em;
`

class App extends Component {
    render () {
        return (
            <AppBody>
                <FactListWrap>
                    <FactList data={stations} />
                </FactListWrap>
                <FactListWrap>
                    <FactList data={lines} />
                </FactListWrap>
            </AppBody>
        )
    }
}

export default App
