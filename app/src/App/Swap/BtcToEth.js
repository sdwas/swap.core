import React, { Component, Fragment } from 'react'
import { web3, bitcoin } from '../../swap'
import { EthSwap, BtcSwap } from '../../swap/swaps'
import { BTC2ETH } from '../../swap/flows'
import { request } from '../../util'


export default class BtcToEth extends Component {

  state = {
    flow: null,
  }

  componentWillMount() {
    // TODO this might be from url query
    const { swap } = this.props

    const ethSwap = new EthSwap({
      lib: web3,
      gasLimit: 40 * 1e5,
    })

    const btcSwap = new BtcSwap({
      lib: bitcoin,
      account: {},
      address: '0x0',
      keyPair: {},
      fetchUnspents: (address) => request.get(`https://test-insight.bitpay.com/api/addr/${address}/utxo`),
    })

    const getBalance = () => {
      // TODO resolve balance from crypto instances
      return 10
    }

    const flow = swap.setFlow(BTC2ETH, {
      ethSwap,
      btcSwap,
      getBalance,
    })

    this.state.flow = flow.storage

    // swap.storage.on('update', this.handleStorageUpdate)
    swap.flow.storage.on('update', this.handleFlowStorageUpdate)
    swap.flow.on('leave step', this.handleLeaveStep)
    swap.flow.on('enter step', this.handleEnterStep)
  }

  componentWillUnmount() {
    const { swap } = this.props

    // swap.storage.off('update', this.handleStorageUpdate)
    swap.flow.storage.off('update', this.handleFlowStorageUpdate)
    swap.flow.off('leave step', this.handleLeaveStep)
    swap.flow.off('enter step', this.handleEnterStep)
  }

  // handleStorageUpdate = (values) => {
  //   console.log('new order storage values', values)
  //
  //   this.setState({
  //     swap: values,
  //   })
  // }

  handleFlowStorageUpdate = (values) => {
    console.log('new flow storage values', values)

    this.setState({
      flow: values,
    })

    localStorage.setItem('swap:eth2btc', values)
  }

  handleLeaveStep = (index) => {
    console.log('leave step', index)
  }

  handleEnterStep = (index) => {
    console.log('\n-----------------------------\n\n')
    console.log('enter step', index)

    this.setState({
      flowStep: index,
    })
  }

  signSwap = () => {
    const { swap } = this.props

    swap.flow.sign()
  }

  submitSecret = () => {

  }

  updateBalance = () => {

  }

  render() {
    const { flow } = this.state
    const { swap } = this.props

    console.log('BtcToEth flow:', flow)

    return (
      <div>
        {
          swap.id && (
            swap.isMy ? (
              <strong>{swap.sellAmount} {swap.sellCurrency} &#10230; {swap.buyAmount} {swap.buyCurrency}</strong>
            ) : (
              <strong>{swap.buyAmount} {swap.buyCurrency} &#10230; {swap.sellAmount} {swap.sellCurrency}</strong>
            )
          )
        }

        {
          !swap.id && (
            swap.isMy ? (
              <h3>This order doesn't have a buyer</h3>
            ) : (
              <Fragment>
                <h3>The order creator is offline. Waiting for him..</h3>
                <div>Loading...</div>
              </Fragment>
            )
          )
        }
        
        {
          flow.isWaitingForOwner && (
            <Fragment>
              <h3>Waiting for other user when he connect to the order</h3>
              <div>Loading...</div>
            </Fragment>
          )
        }
        
        {
          (flow.step === 1 || flow.isMeSigned) && (
            <h3>1. Please confirm your participation to begin the deal</h3>
          )
        }
        {
          flow.step === 1 && (
            <Fragment>
              <div>
                Confirmation of the transaction is necessary for crediting the reputation.
                If a user does not bring the deal to the end he gets a negative reputation.
              </div>
              {
                flow.isParticipantSigned && (
                  <h4>Other user confirmed his participation</h4>
                )
              }
              {
                !flow.isSignFetching && !flow.isMeSigned && (
                  <button onClick={this.signSwap}>Confirm</button>
                )
              }
              {
                flow.isSignFetching && (
                  <Fragment>
                    <h5>Please wait. Confirmation processing</h5>
                    {
                      flow.signTransactionUrl && (
                        <div>
                          Transaction:
                          <strong>
                            <a href={flow.signTransactionUrl} target="_blank">{flow.signTransactionUrl}</a>
                          </strong>
                        </div>
                      )
                    }
                    <div>Loading...</div>
                  </Fragment>
                )
              }
              {
                flow.isMeSigned && (
                  <h4>You successfully confirmed your participation</h4>
                )
              }
              {
                flow.isMeSigned && !flow.isParticipantSigned && (
                  <Fragment>
                    <h5>Waiting when other user confirm his participation</h5>
                    <div>Loading...</div>
                  </Fragment>
                )
              }
            </Fragment>
          )
        }

        {/* ----------------------------------------------------------- */}

        {
          flow.isMeSigned && flow.isParticipantSigned && (
            <Fragment>
              <h3>2. Create a secret key</h3>

              {
                !flow.secretHash ? (
                  <Fragment>
                    <input type="text" placeholder="Secret Key" value={flow.secret} />
                    <br />
                    <button onClick={this.submitSecret}>Confirm</button>
                  </Fragment>
                ) : (
                  <Fragment>
                    <div>Save the secret key! Otherwise there will be a chance you loose your money!</div>
                    <div>Secret Key: <strong>{flow.secret}</strong></div>
                    <div>Secret Hash: <strong>{flow.secretHash}</strong></div>
                  </Fragment>
                )
              }

              {
                flow.step === 3 && flow.notEnoughMoney && !flow.checkingBalance && (
                  <Fragment>
                    <h3>Not enough money for this swap. Please charge the balance</h3>
                    <div>
                      <div>Your balance: <strong>{flow.balance}</strong> BTC</div>
                      <div>Required balance: <strong>{flow.requiredAmount}</strong> {flow.requiredCurrency}</div>
                      <hr />
                      <span>{flow.address}</span>
                    </div>
                    <br />
                    <button type="button" onClick={this.updateBalance}>Continue</button>
                  </Fragment>
                )
              }
              {
                flow.step === 3 && flow.checkingBalance && (
                  <div>Checking balance..</div>
                )
              }

              {
                (flow.step === 4 || flow.btcScriptData) && (
                  <h3>3. Creating Bitcoin Script. Please wait, it will take a while</h3>
                )
              }

              {
                (flow.step === 5 || flow.isBtcScriptFunded) && (
                  <h3>4. Charging Bitcoin Script. Please wait, it will take a while</h3>
                )
              }

              {
                (flow.step === 6 || flow.isEthSwapCreated) && (
                  <h3>5. ETH Owner received Bitcoin Script and Secret Hash. Waiting when he creates ETH Contract</h3>
                )
              }

              {
                (flow.step === 7 || flow.isWithdrawn) && (
                  <h3>6. ETH Contract created and charged. Requesting withdrawal from ETH Contract. Please wait</h3>
                )
              }
              {
                flow.step === 7 && flow.ethSwapWithdrawTransactionUrl && (
                  <div>
                    Transaction:
                    <strong>
                      <a href={flow.ethSwapWithdrawTransactionUrl} target="_blank">{flow.ethSwapWithdrawTransactionUrl}</a>
                    </strong>
                  </div>
                )
              }

              {
                flow.isWithdrawn && (
                  <Fragment>
                    <h3>7. Money was transferred to your wallet. Check the balance.</h3>
                    <h2>Thank you for using Swap.Online!</h2>
                  </Fragment>
                )
              }

              {
                ((flow.step > 3 && flow.step !== 8) || flow.checkingBalance) && (
                  <div>Loading...</div>
                )
              }
            </Fragment>
          )
        }
      </div>
    )
  }
}