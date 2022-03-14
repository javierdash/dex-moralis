//require('dotenv').config(); 

// connect to Moralis server
const serverUrl = "https://kjfkhnisfbja.usemoralis.com:2053/server"
const appId = "7R1AtAtDI0yqorQVwB9Fjs6Dko0QJkp1Ye6vzJlJ"
Moralis.start({ serverUrl, appId });


Moralis
    .initPlugins()
    .then(() => console.log('Plugins have been initialized YEAAAH'));

const $tokenBalanceTBody = document.querySelector('.js-token-balances');
const $selectedToken = document.querySelector('.js-from-token');
const $amountInput = document.querySelector('.js-from-amount');

// Utilities 
const tokenValue = (value, decimals) => 
    (decimals? value / Math.pow(10, decimals) : value);

// Login-Logout and initialization 
// add from here down
async function login() {
    let user = Moralis.User.current();
    if (!user) {
      user = await Moralis.authenticate();
    }
    console.log("logged in user:", user);
    getStats();
  }

async function initSwapForm(event) {
      event.preventDefault();
      $selectedToken.innerText = event.target.dataset.symbol;
      $selectedToken.dataset.address = event.target.dataset.address;
      $selectedToken.dataset.decimals = event.target.dataset.decimals;
      $selectedToken.dataset.max = event.target.dataset.max;
      $amountInput.removeAttribute('disabled');
      $amountInput.value = '';
      document.querySelector('js-submit').removeAttribute('disabled');
      document.querySelector('js-cancel').removeAttribute('disabled');
      document.querySelector('js-quote-container').innerHTML = '';
  //    document.querySelector('.js-amount-error').innerText = '';       
  }

async function getStats() {
    const balances = await Moralis.Web3API.account.getTokenBalances({chain: 'eth'});
    console.log(balances);

    $tokenBalanceTBody.innerHTML = balances.map( (token, index) => `
        <tr>
            <td>${index +1}</td>
            <td>${token.symbol}</td>
            <td>${tokenValue(token.balance, token.decimals)}</td>
            <td>            
            <button
                    class="js-swap btn btn-success"
                    data-address="${token.token_address}"
                    data-symbol="${token.symbol}"
                    data-decimals="${token.decimals}"
                    data-max="${tokenValue(token.balance, token.decimals)}"
                >
                    Swap
                </button>
            </td>
        </tr>
    `).join('');
    
    for(let $btn of $tokenBalanceTBody.querySelectorAll('.js-swap')) {
        $btn.addEventListener('click', initSwapForm);
    }

}

async function logOut() {
    await Moralis.User.logOut();
    console.log("logged out");
  }

  document.getElementById("btn-login").addEventListener('click', login);
  document.getElementById("btn-logout").addEventListener('click', logOut);

/*

async function buyCrytpo() {
    Moralis.Plugins.fiat.buy();
}
 
  document.querySelector("#btn-login").addEventListener('click', login);
  document
        .getElementById("btn-buy-crypto")
        .addEventListener('click', buyCrytpo);

  document.getElementById("btn-logout").addEventListener('click', logOut);

*/

//Quote/Swap 
async function formSubmitted(event) {
    event.preventDefault();
    const fromAmount = Number.parseFloat($amountInput.value);
    const fromMaxValue = Number.parseFloat($selectedToken.dataset.max);

    if ( Number.isNaN(fromAmount) || fromAmount > fromMaxValue) {
        //invalid input
        document.querySelector('.js-amount-error').innerText = 'Invalid amount, maybe you put algo mal!';
        return;
    } else {
        document.querySelector('.js-amount-error').innerText = '';       
    }
}

async function formCanceled(event) {
    event.preventDefault();
    document.querySelector('js-submit').setAttribute('disabled', '');
    document.querySelector('js-cancel').setAttribute('disabled'), '';
    $amountInput.value = '';
    $amountInput.setAttribute('disabled', '');
    delete $selectedToken.dataset.address;
    delete $selectedToken.dataset.decimals;
    delete $selectedToken.dataset.max;
    document.querySelector('js-quote-container').innerHTML = '';
    document.querySelector('.js-amount-error').innerText = '';       
}

document.querySelector('.js-submit').addEventListener('click', formSubmitted);
document.querySelector('.js-cancel').addEventListener('click', formCanceled);




// To token dropdown preparation
async function getTop10Tokens() {
    const response = await fetch('https://api.coinpaprika.com/v1/coins');
    const tokens = await response.json();
//    console.log(tokens);
    return tokens
            .filter(token => token.rank >=1 && token.rank <= 20)
            .map(token => token.symbol);
}

async function getTickerData(tickerList) {
    //const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({ DOESN´T WORK 
    //   chain: 'eth',
    //});
    const response = await fetch('https://api.1inch.exchange/v3.0/1/tokens'); //says "includes" is undefined on console
    const tokens = await response.json();
    const tokenList = Object.values(tokens.tokens);

    const data = tokenList.filter(token => tickerList.includes(token.symbol));  
    console.log("tickerData", data);
    return data;
}



//THIS DOESNT FIND MAP...
function renderTokenDropdown(tokens) {
  //  console.log(tokens)
    const options = tokens.map(token => `
        <option value="${token.address}-${token.decimals}">
            ${token.name}
        </option>
        `).join('');
       
 //   document.querySelector('[name=from-token]').innerHTML = options;
    document.querySelector('[name=to-token]').innerHTML = options;
    document.querySelector('.js-submit').removeAttribute('disabled');
}



async function formSubmitted(event) {
    event.preventDefault();
    const fromToken = document.querySelector('[name=from-token]').value;
    const toToken = document.querySelector('[name=to-token]').value;
    const [fromDecimals, fromAddress] = fromToken.split('-'); 
    const [toDecimals, toAddress] = toToken.split('-');
    const fromUnit = 10 ** fromDecimals;
    const decimalRatio = 10 ** (fromDecimals - toDecimals);

    const url = `https://api.1inch.exchange/v3.0/1/quote?fromTokenAddress=${fromAddress}&toTokenAddress=${toAddress}&amount=${fromUnit}`;
    
    try {
    //console.log(url);
    const response = await fetch(url);
    const quote = await response.json();
    const exchange_rate = Number(quote.toTokenAmount) / Number(quote.fromTokenAmount) * decimalRatio;
    document.querySelector('.js-quote-container').innerHTML = `
        <p>1 ${quote.fromToken.symbol} = ${exchange_rate} ${quote.toToken.symbol} </p>
        <p>Gas fee: ${quote.estimatedGas}</p>
    `;
  } catch(e) {
    document.querySelector('.js-quote-container').innerHTML = `you cant converted to the same coin!`
  }
}

document
    .querySelector('.js-submit')
    .addEventListener('click', formSubmitted);

  getTop10Tokens()             
             .then(getTickerData) 
//             .then(console.log)
             .then(renderTokenDropdown);