const express = require('express');
const { auth, resolver, protocol } = require('@iden3/js-iden3-auth');
const getRawBody = require('raw-body');
const path = require('path');
const app = express();
const port = 5001;

app.use(express.static('static'));

app.get('/api/sign-in', (req, res) => {
    console.log('get Auth Request');
    GetAuthRequest(req, res);
});

app.post('/api/callback', (req, res) => {
    console.log('callback');
    Callback(req, res);
});

app.listen(port, () => {
    console.log('server running on port', port);
});

// Create a map to store the auth requests and their session IDs
const requestMap = new Map();

async function GetAuthRequest(req, res) {
    // Audience is verifier id
    const hostUrl = 'https://8b4a-79-158-79-100.ngrok-free.app'; // Issuer ip:5001
    const sessionId = 1;
    const callbackURL = '/api/callback';
    const audience =
        'did:polygonid:polygon:mumbai:2qCWVemr8mh6FcK8ZUQhn2vEJCbqsZb8FUYkA1Lio5'; //<issuer-did-test>

    const uri = `${hostUrl}${callbackURL}?sessionId=${sessionId}`;

    const request = auth.createAuthorizationRequest(
        'ProofOfValidKYC',
        audience,
        uri
    );

    request.id = '7f38a193-0918-4a48-9fac-36adfdb8b542';
    request.thid = '7f38a193-0918-4a48-9fac-36adfdb8b542';

    // Add request for a specific proof
    const proofRequest = {
        id: 1654984164,
        circuitId: 'credentialAtomicQuerySigV2',
        query: {
            allowedIssuers: ['*'],
            type: 'ProofOfValidKYC',
            context:
                'https://raw.githubusercontent.com/aleixaleix/W3CSchemas/main/KYC_test/KYC.jsonld',
            credentialSubject: {
                valid: {
                    $eq: 1,
                },
            },
        },
    };
    const scope = request.body.scope ?? [];
    console.log(scope);

    // If this line is commented and the "proofRequest" is no added in scope section the authentication works well.
    // If we add the "proofRequest" in scope section the auth not works
    request.body.scope = [...scope, proofRequest];

    //Complete request
    // const requ = {
    //     id: '7f38a193-0918-4a48-9fac-36adfdb8b542',
    //     thid: '7f38a193-0918-4a48-9fac-36adfdb8b542',
    //     from: 'did:polygonid:polygon:mumbai:2qCWVemr8mh6FcK8ZUQhn2vEJCbqsZb8FUYkA1Lio5',
    //     typ: 'application/iden3comm-plain-json',
    //     type: 'https://iden3-communication.io/authorization/1.0/request',
    //     body: {
    //         reason: 'ProofOfValidKYC',
    //         message: '',
    //         callbackUrl:
    //             'https://8b4a-79-158-79-100.ngrok-free.app/api/callback?sessionId=1',
    //         scope: [
    //             {
    //                 id: 1654984164,
    //                 circuitId: 'credentialAtomicQuerySigV2',
    //                 query: {
    //                     allowedIssuers: ['*'],
    //                     type: 'ProofOfValidKYC',
    //                     context:
    //                         'https://raw.githubusercontent.com/aleixaleix/W3CSchemas/main/KYC_test/KYC.jsonld',
    //                     credentialSubject: {
    //                         valid: {
    //                             $eq: 1,
    //                         },
    //                     },
    //                 },
    //             },
    //         ],
    //     },
    // };

    // Store auth request in map associated with session ID
    requestMap.set(`${sessionId}`, request);
    console.log('%O', request.scope);
    const encodedReq = btoa(JSON.stringify(request));
    const deepLink = `iden3comm://?i_m=${encodedReq}`;

    return res.status(200).json({ deepLink });
}

async function Callback(req, res) {
    // Get session ID from request
    const sessionId = req.query.sessionId;

    // get JWZ token params from the post request
    const raw = await getRawBody(req);
    const tokenStr = raw.toString().trim();
    console.log('tokenStr', tokenStr);

    const ethURL = 'https://polygon-mumbai.infura.io/v3/<API_KEY>';
    const contractAddress = '0x134B1BE34911E39A8397ec6289782989729807a4';
    const keyDIR = './keys';

    const ethStateResolver = new resolver.EthStateResolver(
        ethURL,
        contractAddress
    );

    const resolvers = {
        ['polygon:mumbai']: ethStateResolver,
    };

    // fetch authRequest from sessionID
    const authRequest = requestMap.get(`${sessionId}`);
    console.log('authRequest', authRequest);

    // EXECUTE VERIFICATION
    const verifier = await auth.Verifier.newVerifier({
        stateResolver: resolvers,
        circuitsDir: path.join(__dirname, './circuits'),
        ipfsGatewayURL: 'https://ipfs.io',
    });

    try {
        const opts = {
            AcceptedStateTransitionDelay: 5 * 60 * 1000, // 5 minute
        };
        authResponse = await verifier.fullVerify(tokenStr, authRequest, opts);
        console.log('authResponse', authResponse);
    } catch (error) {
        return res.status(500).send(error);
    }
    return res
        .status(200)
        .set('Content-Type', 'application/json')
        .send(
            'user with ID: ' + authResponse.from + ' Succesfully authenticated'
        );
}
