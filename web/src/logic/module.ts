import { Contract, EventLog, ZeroAddress, parseEther, parseUnits } from "ethers";
import { ethers } from 'ethersv5';
import { BaseTransaction } from '@safe-global/safe-apps-sdk';
import { getSafeInfo, isConnectedToSafe, submitTxs } from "./safeapp";
import { getJsonRpcProvider, getProvider } from "./web3";
import WhitelistHook from "./WhitelistHook.json"


// Plugin and Manager address

const moduleAddress = "0x6e42BaEc479D8A32C8B383B80A78434E232867E8"


export const loadWhitelistedAddresses = async(): Promise<string[]> => {


    // Initialize the sdk with the address of the EAS Schema contract address
    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId =  (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)
    const pluginSettings =  new Contract(
        moduleAddress,
        WhitelistHook.abi,
        bProvider
    )
    const safeInfo = await getSafeInfo()

    const addedEvents = (await pluginSettings.queryFilter(pluginSettings.filters.AddressWhitelisted)) as EventLog[]

    let addedAddresses = addedEvents.filter((event: EventLog) => event.args.safeAccount == safeInfo.safeAddress || event.args.safeAccount == ZeroAddress).map((event: EventLog)  => event.args.account)
    console.log(addedAddresses)

    const removedEvents = (await pluginSettings.queryFilter(pluginSettings.filters.AddressRemovedFromWhitelist)) as EventLog[]
    // const removedAddresses = removedEvents.map((event: EventLog) => event.args.account)
    const removedAddresses = removedEvents.filter((event: EventLog) => event.args.safeAccount == safeInfo.safeAddress || event.args.safeAccount == ZeroAddress).map((event: EventLog)  => event.args.account)

    console.log(removedAddresses)
    for(let i=0; i< removedAddresses.length; i++) {
        const index = addedAddresses.indexOf(removedAddresses[i])
        if (index !== -1) {
           addedAddresses.splice(index, 1);
       }   
     }
    return addedAddresses 
}

const buildAddToWhitelist = async(addresses: string[]): Promise<BaseTransaction> => {
    

    // Initialize the sdk with the address of the EAS Schema contract address
    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId =  (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeInfo = await getSafeInfo()

    const pluginSettings =  new Contract(
        moduleAddress,
        WhitelistHook.abi,
        bProvider
    )

    return {
        to: moduleAddress,
        value: "0",
        data: (await pluginSettings.addToWhitelist.populateTransaction(addresses)).data
    }
}

const buildRemoveFromWhitelist = async(addresses: string[]): Promise<BaseTransaction> => {
    

    // Initialize the sdk with the address of the EAS Schema contract address
    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId =  (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeInfo = await getSafeInfo()

    const pluginSettings =  new Contract(
        moduleAddress,
        WhitelistHook.abi,
        bProvider
    )

    return {
        to: moduleAddress,
        value: "0",
        data: (await pluginSettings.removeFromWhitelist.populateTransaction(addresses)).data
    }
} 

export const updateWhitelistedAddress = async( addedAddresses: string[], removedAddresses: string[]) => {

    if (!await isConnectedToSafe()) throw Error("Not connected to a Safe")

    const info = await getSafeInfo()
    const txs: BaseTransaction[] = []


    txs.push(await buildAddToWhitelist(addedAddresses))
    txs.push(await buildRemoveFromWhitelist(removedAddresses))
    
    if (txs.length == 0) return
    await submitTxs(txs)
}


