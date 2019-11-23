using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
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
    private int timer;

    public void Start()
    {
        destrunctionCall = false;
        lc = FindObjectOfType<LevelController>();
    }
    private void Update()
    {
        lc.lastPlayerPosition = transform.position;
    }
    private void Awake()
    {
        if (instance == null) 
            instance = this;
    }

    //method for damage proceccing by 'Player'
    public void GetDamage()   
    {
        Debug.Log("GetDamaged!");
        if (!isInvincible && !destrunctionCall)
        {
            Destruction();
        }
            
    }

    //'Player's' destruction procedure
    void Destruction()
    {
        Debug.Log("Destroy Player");
        destrunctionCall = true;
        Instantiate(destructionFX, transform.position, Quaternion.identity); 
        Instantiate(destructionSound, transform.position, Quaternion.identity);
        playerShootingScript = gameObject.GetComponent<PlayerShooting>();
        playerShootingScript.ShootingIsActive = false;
        gameObject.SetActive(false);
        Invoke("PlayerRevive", 2f);
    }
    void PlayerRevive()
    {
        Destroy(gameObject);
           
        lc.ShowAdsUI();
        Time.timeScale = 0.05f;
    }
    

    void GameOver()
    {

    }

    private void OnTriggerEnter2D(Collider2D collision) //when a projectile collides with another object
    {
        if (collision.tag == "EnemyBoss") //if anoter object is 'player' or 'enemy sending the command of receiving the damage
        {
            this.GetDamage();
        }
    }
    public IEnumerator RemoveInvincible(float delay)
    {
        yield return new WaitForSecondsRealtime(delay);
        isInvincible = false;
    }
}
















