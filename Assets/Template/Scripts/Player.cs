using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// This script defines which sprite the 'Player" uses and its health.
/// </summary>

public class Player : MonoBehaviour
{
    public GameObject destructionFX;
    public GameObject destructionSound;
    public GameObject timeslowEFX;
    public bool isInvincible;
    public bool isAttackMode;
    private bool destrunctionCall;
    PlayerShooting playerShootingScript;
    LevelController lc;
    public static Player instance;

    public void Start()
    {
        destrunctionCall = false;
    }
    private void Update()
    {
        lc = GameObject.FindObjectOfType<LevelController>();
        lc.lastPlayerPosition = transform.position;
    }
    private void Awake()
    {
        if (instance == null) 
            instance = this;
    }

    //method for damage proceccing by 'Player'
    public void GetDamage(int damage)   
    {
        if (!isInvincible && !destrunctionCall)
        {
            Destruction();
        }
            
    }    

    //'Player's' destruction procedure
    void Destruction()
    {
        destrunctionCall = true;
        Instantiate(destructionFX, transform.position, Quaternion.identity); //generating destruction visual effect and destroying the 'Player' object
        Instantiate(destructionSound, transform.position, Quaternion.identity);
        playerShootingScript = gameObject.GetComponent<PlayerShooting>();
        playerShootingScript.ShootingIsActive = false;
        Destroy(gameObject);
        
        if (lc.playerLife > 0)
        {
            lc.playerLife--;
            lc.StartPlayer();
        }
        else
        {
            Debug.Log("Game Over");
            lc.Invoke("ShowGameOverUI", 2);
        }
    }
    public IEnumerator RemoveInvincible(float delay)
    {
        yield return new WaitForSecondsRealtime(delay);
        isInvincible = false;
    }
}
















