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
    public bool isInvincible;
    public bool isAttackMode;
    public static Player instance; 

    private void Awake()
    {
        if (instance == null) 
            instance = this;
    }

    //method for damage proceccing by 'Player'
    public void GetDamage(int damage)   
    {
        if(!isInvincible)
            Destruction();
    }    

    //'Player's' destruction procedure
    void Destruction()
    {
        Instantiate(destructionFX, transform.position, Quaternion.identity); //generating destruction visual effect and destroying the 'Player' object
        Destroy(gameObject);
        LevelController lc = GameObject.FindObjectOfType<LevelController>();
        if (lc.playerLife > 0)
        {
            lc.playerLife--;
            lc.StartPlayer();
        }
        else
        {
            Debug.Log("Game Over");
        }
    }
    public IEnumerator RemoveInvincible(float delay)
    {
        yield return new WaitForSecondsRealtime(delay);
        isInvincible = false;
    }
}
















