import './App.css'
import h from 'react-hyperscript'
import { Provider, connect } from 'react-redux'
import styled from 'styled-components'
import { store } from './data'
import { List } from './helpers'
import FactGroup from './FactGroup'

const AppBody = styled.div`
    font-family: "Comic Sans MS", "Marker Felt", sans-serif;
    font-size: 16px;
    line-height: 18px;
`

const AppContent = styled(List)`
    &>li {
        margin: 1em;
    }
    padding-bottom: 100px;
`

const Footer = styled.footer`
    position: fixed;
    bottom: 0;
    right: 0;
    background-color: rgba(255,255,255,0.9);
    border-top: 1px solid #ccc;
    width: 100%;
    padding: 0.5em;
`

const NewListButton = styled.button`
    appearance: none;
    border: none;
    font: inherit;
    text-decoration: underline;
`

const App = connect(
    (db) => ({ data: db.where({ 'type': 'fact_group' }) }),
)(({ data, dispatch }) => (
    h(AppBody, [
        h(AppContent, { data }, (id) =>
            h(FactGroup, { id })),
        h(Footer, [
            h(NewListButton, { onClick: () => dispatch('createFactGroup') }, [
                '+ New Fact Group',
            ]),
        ]),
    ])
))

const Root = () => h(Provider, { store }, h(App))

export default Root
